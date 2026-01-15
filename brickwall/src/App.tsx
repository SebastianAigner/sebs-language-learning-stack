import { useState, useRef, useMemo, useEffect } from 'react'
import './App.css'

// Central mapping for model names to human-readable versions
const MODEL_DISPLAY_NAMES: { [key: string]: string } = {
  'anthropic/claude-opus-4.1': 'Claude',
  'openai/gpt-4o': 'GPT-4o',
  'openai/gpt-5-chat': 'GPT-5',
  'openai/o3-mini-high': 'o3-mini-high',
  'deepseek/deepseek-r1-0528': 'DeepSeek R1',
  'x-ai/grok-4': 'Grok-4',
  'google/gemini-3-flash-preview': 'Gemini 3 Flash'
}

const getModelDisplayName = (modelId: string): string => {
  return MODEL_DISPLAY_NAMES[modelId] || modelId
}

function App() {
  const [message, setMessage] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [messages, setMessages] = useState<{text: string, isUser: boolean, fullText?: string}[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('google/gemini-3-flash-preview')
  const [prependText, setPrependText] = useState('')
  const [appendText, setAppendText] = useState('')
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error', fadeOut?: boolean}[]>([])
  const [showApiKeyControls, setShowApiKeyControls] = useState(false)
  const [assistantName, setAssistantName] = useState('Assistant')
  const [userName, setUserName] = useState('You')
  const [activeConversationModel, setActiveConversationModel] = useState<string | null>(null)
  const [followupText, setFollowupText] = useState('')
  const [askWithModel, setAskWithModel] = useState('anthropic/claude-opus-4.1')
  const [showGreenFlash, setShowGreenFlash] = useState(false)
  const messageInputRef = useRef<HTMLInputElement>(null)

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    if (theme === 'dark') {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  // Determine message type for status indicator
  const getMessageStatus = (messageText: string) => {
    if (!messageText.trim()) return null
    
    const sendFollowupMessage = messageText.trim() === '!ff' || messageText.trim() === '！' || messageText.trim() === '!'
    const continueConversation = (messageText.includes('!f') && !sendFollowupMessage) || messageText.includes('@')
    const asideMessage = messageText.startsWith('#')
    
    if (sendFollowupMessage) return 'FOLLOW'
    if (continueConversation) return 'FOLLOW'
    if (asideMessage) return 'ASIDE'
    return 'NEW'
  }

  const messageStatus = getMessageStatus(message)

  // Check if any assistant message contains the star emoji
  const showStarImage = useMemo(() => {
    return messages.some(msg => !msg.isUser && msg.text.includes('⭐️'))
  }, [messages])

  // Track star image header replacement
  const [showStarInHeader, setShowStarInHeader] = useState(false)
  const [starFadingOut, setStarFadingOut] = useState(false)
  const [currentStarImage, setCurrentStarImage] = useState('')
  
  // Array of available star images
  const starImages = [
    'https://cdn.betterttv.net/emote/60a21baf67644f1d67e87a6c/3x.webp',
    '/fat.webp',
    '/fat2.jpg',
    '/teto.webp'
  ]
  
  useEffect(() => {
    if (showStarImage) {
      // Randomly select a star image
      const randomImage = starImages[Math.floor(Math.random() * starImages.length)]
      setCurrentStarImage(randomImage)
      
      // Immediately show star in header
      setShowStarInHeader(true)
      setStarFadingOut(false)
      
      // Play correct sound at 50% volume and flash green border
      const audio = new Audio('/correct.mp3')
      audio.volume = 0.5
      audio.play().catch(console.error)
      
      // Flash green border
      setShowGreenFlash(true)
      setTimeout(() => setShowGreenFlash(false), 1000)
      
      // After 5 seconds, start crossfade back to original header
      const fadeTimer = setTimeout(() => {
        setStarFadingOut(true)
        
        // After crossfade completes (1 second), hide star completely
        const hideTimer = setTimeout(() => {
          setShowStarInHeader(false)
        }, 1000)
        
        return () => clearTimeout(hideTimer)
      }, 5000)
      
      return () => clearTimeout(fadeTimer)
    } else {
      setShowStarInHeader(false)
      setStarFadingOut(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- starImages is a constant array that never changes
  }, [showStarImage])

  // Restore saved values from localStorage on page load
  useEffect(() => {
    const savedApiKey = localStorage.getItem('converser-api-key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }

    const savedPrependText = localStorage.getItem('converser-prepend-text')
    if (savedPrependText !== null) {
      setPrependText(savedPrependText)
    }

    const savedAppendText = localStorage.getItem('converser-append-text')
    if (savedAppendText !== null) {
      setAppendText(savedAppendText)
    }

    const savedAssistantName = localStorage.getItem('converser-assistant-name')
    if (savedAssistantName !== null) {
      setAssistantName(savedAssistantName)
    }

    const savedUserName = localStorage.getItem('converser-user-name')
    if (savedUserName !== null) {
      setUserName(savedUserName)
    }

    const savedSelectedModel = localStorage.getItem('converser-selected-model')
    if (savedSelectedModel !== null) {
      setSelectedModel(savedSelectedModel)
    }

    const savedFollowupText = localStorage.getItem('converser-followup-text')
    if (savedFollowupText !== null) {
      setFollowupText(savedFollowupText)
    }

    // Focus the main message input on page load
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }, [])

  // Toast management
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      // Add fade-out class first
      setToasts(prev => prev.map(toast => 
        toast.id === id ? { ...toast, fadeOut: true } : toast
      ))
      
      // Remove completely after fade animation (300ms)
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, 300)
    }, 3000)
  }

  const dismissToast = (id: number) => {
    // Add fade-out class first
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, fadeOut: true } : toast
    ))
    
    // Remove completely after fade animation (300ms)
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 300)
  }

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('converser-api-key', apiKey)
      showToast('API key saved to local storage')
    }
  }

  const restoreApiKey = () => {
    const savedKey = localStorage.getItem('converser-api-key')
    if (savedKey) {
      setApiKey(savedKey)
      showToast('API key restored from local storage')
    } else {
      showToast('No API key found in local storage', 'error')
    }
  }

  const savePrependText = () => {
    localStorage.setItem('converser-prepend-text', prependText)
    showToast('Prepend text saved to local storage')
  }

  const restorePrependText = () => {
    const savedText = localStorage.getItem('converser-prepend-text')
    if (savedText !== null) {
      setPrependText(savedText)
      showToast('Prepend text restored from local storage')
    } else {
      showToast('No prepend text found in local storage', 'error')
    }
  }

  const saveAppendText = () => {
    localStorage.setItem('converser-append-text', appendText)
    showToast('Append text saved to local storage')
  }

  const restoreAppendText = () => {
    const savedText = localStorage.getItem('converser-append-text')
    if (savedText !== null) {
      setAppendText(savedText)
      showToast('Append text restored from local storage')
    } else {
      showToast('No append text found in local storage', 'error')
    }
  }

  const saveAssistantName = () => {
    localStorage.setItem('converser-assistant-name', assistantName)
    showToast('Assistant name saved to local storage')
  }

  const restoreAssistantName = () => {
    const savedName = localStorage.getItem('converser-assistant-name')
    if (savedName !== null) {
      setAssistantName(savedName)
      showToast('Assistant name restored from local storage')
    } else {
      showToast('No assistant name found in local storage', 'error')
    }
  }

  const saveUserName = () => {
    localStorage.setItem('converser-user-name', userName)
    showToast('User name saved to local storage')
  }

  const restoreUserName = () => {
    const savedName = localStorage.getItem('converser-user-name')
    if (savedName !== null) {
      setUserName(savedName)
      showToast('User name restored from local storage')
    } else {
      showToast('No user name found in local storage', 'error')
    }
  }

  const saveSelectedModel = () => {
    localStorage.setItem('converser-selected-model', selectedModel)
    showToast('Model selection saved to local storage')
  }

  const restoreSelectedModel = () => {
    const savedModel = localStorage.getItem('converser-selected-model')
    if (savedModel !== null) {
      setSelectedModel(savedModel)
      showToast('Model selection restored from local storage')
    } else {
      showToast('No model selection found in local storage', 'error')
    }
  }

  const saveFollowupText = () => {
    localStorage.setItem('converser-followup-text', followupText)
    showToast('Follow-up text saved to local storage')
  }

  const restoreFollowupText = () => {
    const savedText = localStorage.getItem('converser-followup-text')
    if (savedText !== null) {
      setFollowupText(savedText)
      showToast('Follow-up text restored from local storage')
    } else {
      showToast('No follow-up text found in local storage', 'error')
    }
  }

  const copyMessageToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Message copied to clipboard')
    }).catch(() => {
      showToast('Failed to copy message', 'error')
    })
  }

  const askWithSelectedModel = async (fullMessage: string, displayMessage: string, modelToUse: string) => {
    // Set active conversation to the selected model
    setActiveConversationModel(modelToUse)
    
    // Clear existing messages and start fresh conversation with selected model
    // Show the short version but send the full version
    const userMessage = { text: displayMessage, isUser: true }
    setMessages([userMessage])
    setIsLoading(true)

    // Show toast indicating which model is being used
    showToast(`Asking ${getModelDisplayName(modelToUse)}`)

    try {
      await streamOpenRouterResponse(fullMessage, apiKey, false, modelToUse)
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { text: 'Error: Failed to get response', isUser: false }])
    } finally {
      setIsLoading(false)
    }
  }

  const askFollowup = async () => {
    if (!followupText.trim() || !apiKey.trim()) return
    
    const userMessage = { text: followupText.trim(), isUser: true }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Use active conversation model if set, otherwise use selected model
    const modelToUse = activeConversationModel || selectedModel

    // Show toast indicating which model is being used
    showToast(`Sending follow-up to ${getModelDisplayName(modelToUse)}`)

    try {
      await streamOpenRouterResponse(followupText.trim(), apiKey, true, modelToUse)
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { text: 'Error: Failed to get response', isUser: false }])
    } finally {
      setIsLoading(false)
    }
    // Note: We don't clear followupText - it stays persistent
  }

  const askAside = async () => {
    if (!message.trim() || !apiKey.trim()) return
    
    const userMessage = { text: message.trim(), isUser: true }
    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    // Use active conversation model if set, otherwise use selected model
    const modelToUse = activeConversationModel || selectedModel

    // Show toast indicating which model is being used
    showToast(`Sending aside to ${getModelDisplayName(modelToUse)}`)

    try {
      await streamOpenRouterResponse(message.trim(), apiKey, true, modelToUse)
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { text: 'Error: Failed to get response', isUser: false }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (message.trim() && apiKey.trim()) {
      const sendFollowupMessage = message.trim() === '!ff' || message.trim() === '！' || message.trim() === '!'
      const continueConversation = (message.includes('!f') && !sendFollowupMessage) || message.includes('@')
      const asideMessage = message.startsWith('#')
      const cleanMessage = message.replace('!ff', '').replace('!f', '').replace('！', '').replace(/^!(?!f)/, '').replace('@', '').replace(/^#/, '').trim()
      
      // If !ff flag is used, send the followup message instead
      if (sendFollowupMessage) {
        if (!followupText.trim()) {
          showToast('No followup message to send', 'error')
          return
        }
        setMessage('')
        await askFollowup()
        return
      }
      
      // If # prefix is used, send as aside message
      if (asideMessage) {
        const userMessage = { 
          text: cleanMessage, 
          isUser: true, 
          fullText: cleanMessage 
        }
        setMessages(prev => [...prev, userMessage])
        setMessage('')
        setIsLoading(true)

        const modelToUse = activeConversationModel || selectedModel
        showToast(`Sending aside to ${getModelDisplayName(modelToUse)}`)

        try {
          await streamOpenRouterResponse(cleanMessage, apiKey, true, modelToUse)
        } catch (error) {
          console.error('Error:', error)
          setMessages(prev => [...prev, { text: 'Error: Failed to get response', isUser: false }])
        } finally {
          setIsLoading(false)
        }
        return
      }
      
      // Combine prepend + message + append for sending to API (only for new conversations)
      const fullMessage = continueConversation 
        ? cleanMessage 
        : `${prependText}${prependText ? ' ' : ''}${cleanMessage}${appendText ? ' ' : ''}${appendText}`.trim()
      
      const userMessage = { 
        text: cleanMessage, 
        isUser: true, 
        fullText: continueConversation ? undefined : fullMessage 
      }
      
      // Determine model to use BEFORE updating state
      const modelToUse = continueConversation 
        ? (activeConversationModel || selectedModel)
        : selectedModel

      if (continueConversation) {
        setMessages(prev => [...prev, userMessage])
      } else {
        setMessages([userMessage])
        // Reset to user-selected model when starting new conversation
        setActiveConversationModel(null)
      }
      
      setMessage('')
      setIsLoading(true)

      // Show toast indicating which model is being used
      showToast(`Sending to ${getModelDisplayName(modelToUse)}`)

      try {
        await streamOpenRouterResponse(fullMessage, apiKey, continueConversation, modelToUse)
      } catch (error) {
        console.error('Error:', error)
        setMessages(prev => [...prev, { text: 'Error: Failed to get response', isUser: false }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const streamOpenRouterResponse = async (userMessage: string, key: string, continueConversation: boolean, model: string) => {
    const requestBody: {
      model: string;
      messages: { role: string; content: string }[];
      stream: boolean;
      reasoning?: { effort: string };
    } = {
      model: model,
      messages: continueConversation
        ? messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          })).concat([{ role: 'user', content: userMessage }])
        : [{ role: 'user', content: userMessage }],
      stream: true
    }

    // Add reasoning parameter for Claude models
    if (model.includes('anthropic/claude')) {
      requestBody.reasoning = { effort: 'high' }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Converser Chat'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const assistantMessage = { text: '', isUser: false }
    setMessages(prev => [...prev, assistantMessage])

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                assistantMessage.text += content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = { ...assistantMessage }
                  return newMessages
                })
              }
            } catch (parseError) {
              console.warn('Failed to parse chunk:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  return (
    <div className="chat-container">
      <div className="header-section">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="header-image-container">
          <img 
            src="/header.png" 
            alt="Header" 
            className={`header-image ${showStarInHeader ? (starFadingOut ? 'fade-in' : 'instant-hide') : ''}`}
          />
          {showStarInHeader && (
            <img 
              src={currentStarImage} 
              alt="Star emoji reaction"
              className={`header-star-image ${starFadingOut ? 'fade-out' : ''}`}
            />
          )}
        </div>
        <h1 className="page-title">
          <ruby>
            煉瓦<rp>(</rp><rt>れんが</rt><rp>)</rp>
          </ruby>
          の
          <ruby>
            壁<rp>(</rp><rt>かべ</rt><rp>)</rp>
          </ruby>
        </h1>
      </div>
      
      <div className="message-fields">
        <div className="prepend-section">
          <input
            type="text"
            value={prependText}
            onChange={(e) => setPrependText(e.target.value)}
            placeholder="Text to prepend to each new conversation..."
            className="prepend-input"
          />
          <div className="prepend-buttons">
            <button onClick={savePrependText} className="text-button save-text-button">
              Save
            </button>
            <button onClick={restorePrependText} className="text-button restore-text-button">
              Restore
            </button>
          </div>
        </div>
        
        <form onSubmit={(e) => void handleSubmit(e)} className="chat-input">
          <div className="message-input-with-button">
            {messageStatus && (
              <div className={`message-status-indicator ${messageStatus.toLowerCase()}`}>
                {messageStatus}
              </div>
            )}
            <input
              ref={messageInputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                  e.preventDefault()
                  void handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                }
              }}
              placeholder="Type your message... (Add !f to continue conversation)"
              className="message-input"
            />
            <button
              type="button"
              onClick={() => void askAside()}
              disabled={isLoading || !message.trim() || !apiKey.trim()}
              className="ask-aside-button"
              title="Ask without prepend/append text"
            >
              Ask Aside
            </button>
          </div>
        </form>
        
        <div className="append-section">
          <input
            type="text"
            value={appendText}
            onChange={(e) => setAppendText(e.target.value)}
            placeholder="Text to append to each new conversation..."
            className="append-input"
          />
          <div className="append-buttons">
            <button onClick={saveAppendText} className="text-button save-text-button">
              Save
            </button>
            <button onClick={restoreAppendText} className="text-button restore-text-button">
              Restore
            </button>
          </div>
        </div>
      </div>
      <div className="hint-text">
        💡 Tip: Add <code>!f</code> or <code>@</code> to continue conversation, <code>!</code>, <code>!ff</code> or <code>！</code> to send follow-up message, or <code>#</code> to send aside (without prepend/append).
      </div>
      
      <div className={`messages-container ${showGreenFlash ? 'green-flash' : ''}`}>
        {messages.length > 0 && (
          <div className="conversation-model-indicator">
            Using: <strong>{getModelDisplayName(activeConversationModel || selectedModel)}</strong>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isUser ? 'user-message' : 'assistant-message'}`}>
            {msg.isUser ? (
              <div className="user-message-content">
                <strong>{userName}: </strong>
                <span>{msg.text}</span>
                {msg.fullText && (
                  <>
                    <button 
                      className="copy-message-button"
                      onClick={() => copyMessageToClipboard(msg.fullText!)}
                      title="Copy full message (with prepend/append text)"
                    >
                      📋
                    </button>
                    <div className="ask-with-model-container">
                      <select
                        value={askWithModel}
                        onChange={(e) => setAskWithModel(e.target.value)}
                        className="ask-model-dropdown"
                        title="Select model to ask"
                      >
                        <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="anthropic/claude-opus-4.1">Claude</option>
                        <option value="openai/gpt-4o">GPT-4o</option>
                        <option value="openai/gpt-5-chat">GPT-5</option>
                        <option value="openai/o3-mini-high">o3-mini-high</option>
                        <option value="deepseek/deepseek-r1-0528">DeepSeek</option>
                        <option value="x-ai/grok-4">Grok-4</option>
                      </select>
                      <button 
                        className="ask-with-model-button"
                        onClick={() => void askWithSelectedModel(msg.fullText!, msg.text, askWithModel)}
                        title="Ask selected model this question"
                      >
                        Ask
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <strong>{assistantName}: </strong>
                <div className="message-content">
                  {msg.text.split('\n').map((line, lineIndex) => (
                    <div key={lineIndex}>
                      {line}
                      {lineIndex < msg.text.split('\n').length - 1 && <br />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* Follow-up section */}
      <div className="followup-section">
        <input
          type="text"
          value={followupText}
          onChange={(e) => setFollowupText(e.target.value)}
          placeholder="Follow-up question (persistent)..."
          className="followup-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
              e.preventDefault()
              void askFollowup()
            }
          }}
        />
        <div className="followup-buttons">
          <button
            onClick={() => void askFollowup()}
            disabled={isLoading || !followupText.trim() || !apiKey.trim()}
            className="followup-button"
          >
            Ask Follow-up
          </button>
          <button onClick={saveFollowupText} className="text-button save-text-button">
            Save
          </button>
          <button onClick={restoreFollowupText} className="text-button restore-text-button">
            Restore
          </button>
        </div>
      </div>
      
      {/* API Configuration - Bottom of page */}
      <div className="api-controls-container">
        <div className="collapsible-section">
          <button 
            className="collapsible-header"
            onClick={() => setShowApiKeyControls(!showApiKeyControls)}
          >
            <span>Configuration</span>
            <span className={`arrow ${showApiKeyControls ? 'arrow-down' : 'arrow-right'}`}>
              ▶
            </span>
          </button>
          
          {showApiKeyControls && (
            <div className="collapsible-content">
              <div className="api-key-section">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter OpenRouter API Key..."
                  className="api-key-input"
                />
                <div className="api-key-buttons">
                  <button onClick={saveApiKey} className="api-key-button save-button">
                    Save Key
                  </button>
                  <button onClick={restoreApiKey} className="api-key-button restore-button">
                    Restore Key
                  </button>
                </div>
              </div>
              
              <div className="model-section">
                <label htmlFor="model-select" className="model-label">Model:</label>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-dropdown"
                >
                  <option value="google/gemini-3-flash-preview">gemini-3-flash-preview</option>
                  <option value="openai/gpt-4o">gpt-4o</option>
                  <option value="openai/gpt-5-chat">gpt-5-chat</option>
                  <option value="openai/o3-mini-high">o3-mini-high</option>
                  <option value="anthropic/claude-opus-4.1">claude-opus-4.1</option>
                  <option value="deepseek/deepseek-r1-0528">deepseek-r1</option>
                  <option value="x-ai/grok-4">grok-4</option>
                </select>
                <div className="model-buttons">
                  <button onClick={saveSelectedModel} className="text-button save-text-button">
                    Save
                  </button>
                  <button onClick={restoreSelectedModel} className="text-button restore-text-button">
                    Restore
                  </button>
                </div>
              </div>
              
              <div className="names-section">
                <div className="name-input-group">
                  <label className="name-label">Assistant:</label>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="name-input"
                    placeholder="Assistant"
                  />
                  <div className="name-buttons">
                    <button onClick={saveAssistantName} className="text-button save-text-button">
                      Save
                    </button>
                    <button onClick={restoreAssistantName} className="text-button restore-text-button">
                      Restore
                    </button>
                  </div>
                </div>
                
                <div className="name-input-group">
                  <label className="name-label">User:</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="name-input"
                    placeholder="You"
                  />
                  <div className="name-buttons">
                    <button onClick={saveUserName} className="text-button save-text-button">
                      Save
                    </button>
                    <button onClick={restoreUserName} className="text-button restore-text-button">
                      Restore
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type} ${toast.fadeOut ? 'toast-fade-out' : ''}`}
            onClick={() => dismissToast(toast.id)}
          >
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
