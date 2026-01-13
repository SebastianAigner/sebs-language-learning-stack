import React, { useState } from 'react';
import type { GrammarCard } from '../types';
import { 
  loadGrammarCards, 
  addGrammarCard, 
  deleteGrammarCard, 
  updateGrammarCard,
  loadGrammarCardsInRotation,
  toggleGrammarCardRotation,
  getLastExportTime,
  saveLastExportTime
} from '../grammarCards';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Checkbox } from './ui/Checkbox';

interface GrammarCardManagerProps {
  onBack: () => void;
}

export const GrammarCardManager: React.FC<GrammarCardManagerProps> = ({ onBack }) => {
  const [cards, setCards] = useState<GrammarCard[]>(() => loadGrammarCards());
  const [inRotationIds, setInRotationIds] = useState<string[]>(() => loadGrammarCardsInRotation());
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastExportTime, setLastExportTime] = useState(() => getLastExportTime());

  const changedCardsCount = cards.filter(card => 
    card.createdAt > lastExportTime || (card.updatedAt && card.updatedAt > lastExportTime)
  ).length;
  const shouldHighlightExport = changedCardsCount >= 3;

  const handleSubmit = () => {
    if (!newDescription.trim()) return;
    
    const filteredVariants = variants.map(v => v.trim()).filter(v => v !== '');

    if (editingId) {
      updateGrammarCard(editingId, newDescription.trim(), newInstructions.trim() || undefined, filteredVariants.length > 0 ? filteredVariants : undefined);
    } else {
      addGrammarCard(newDescription.trim(), newInstructions.trim() || undefined, filteredVariants.length > 0 ? filteredVariants : undefined);
    }
    
    setNewDescription('');
    setNewInstructions('');
    setVariants([]);
    setEditingId(null);
    setCards(loadGrammarCards());
    setInRotationIds(loadGrammarCardsInRotation());
  };

  const handleEdit = (card: GrammarCard) => {
    setNewDescription(card.description);
    setNewInstructions(card.instructions || '');
    setVariants(card.variants || []);
    setEditingId(card.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setNewDescription('');
    setNewInstructions('');
    setVariants([]);
    setEditingId(null);
  };

  const handleAddVariant = () => {
    setVariants([...variants, '']);
  };

  const handleVariantChange = (index: number, value: string) => {
    const updated = [...variants];
    updated[index] = value;
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleDelete = (id: string) => {
    if (editingId === id) {
      handleCancel();
    }
    deleteGrammarCard(id);
    setCards(loadGrammarCards());
    setInRotationIds(loadGrammarCardsInRotation());
  };

  const handleToggleRotation = (id: string, checked: boolean) => {
    toggleGrammarCardRotation(id, checked);
    setInRotationIds(loadGrammarCardsInRotation());
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `grammar-cards-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    URL.revokeObjectURL(url);

    const now = Date.now();
    saveLastExportTime(now);
    setLastExportTime(now);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Manage Grammar Cards</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={handleExport} 
            variant="secondary" 
            disabled={cards.length === 0}
            className={shouldHighlightExport ? 'export-attention' : ''}
          >
            Export Cards
          </Button>
          <Button onClick={onBack} variant="secondary">Back</Button>
        </div>
      </div>

      <Card style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          {editingId ? 'Edit Grammar Card' : 'Create New Card'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#4a5568' }}>
              Task Description (Shown to user)
            </label>
            <TextArea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Enter grammar task description (e.g. Conjugate 食べる to passive form)"
              rows={2}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#4a5568' }}>
              Instructions / Hints (Hidden by default)
            </label>
            <TextArea
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="Enter additional instructions or hints (Markdown supported)"
              rows={3}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#4a5568' }}>
              Modifiers (Variants)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {variants.map((variant, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    value={variant}
                    onChange={(e) => handleVariantChange(index, e.target.value)}
                    placeholder={`Variant ${index + 1}`}
                  />
                  <Button 
                    variant="danger" 
                    onClick={() => handleRemoveVariant(index)}
                    style={{ padding: '8px 12px' }}
                  >
                    &times;
                  </Button>
                </div>
              ))}
              <Button variant="secondary" onClick={handleAddVariant} style={{ fontSize: '14px' }}>
                + Add Modifier
              </Button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button onClick={handleSubmit} disabled={!newDescription.trim()} style={{ width: '100%' }}>
              {editingId ? 'Update Grammar Card' : 'Add Grammar Card'}
            </Button>
            {editingId && (
              <Button onClick={handleCancel} variant="secondary" style={{ width: '100%' }}>
                Cancel Edit
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Existing Cards</h3>
        {cards.length === 0 ? (
          <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No grammar cards created yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cards.map((card) => (
              <Card key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '20px', borderLeft: inRotationIds.includes(card.id) ? '4px solid #4299e1' : '4px solid #cbd5e0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Checkbox 
                        id={`rotation-${card.id}`}
                        checked={inRotationIds.includes(card.id)}
                        onChange={(e) => handleToggleRotation(card.id, e.target.checked)}
                        label="In Rotation"
                      />
                      <span style={{ fontSize: '10px', color: '#a0aec0', fontFamily: 'monospace' }}>ID: {card.id.slice(0, 8)}</span>
                    </div>
                    {card.createdAt && (
                      <span style={{ fontSize: '10px', color: '#a0aec0' }}>
                        {new Date(card.createdAt).toLocaleDateString()} {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4a5568', fontSize: '12px', textTransform: 'uppercase' }}>Task:</div>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>{card.description}</div>
                  {card.instructions && (
                    <>
                      <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px', color: '#718096', textTransform: 'uppercase' }}>Instructions:</div>
                      <div style={{ fontSize: '14px', color: '#718096', whiteSpace: 'pre-wrap', fontStyle: 'italic', background: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>{card.instructions}</div>
                    </>
                  )}
                  {card.variants && card.variants.length > 0 && (
                    <>
                      <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px', color: '#718096', textTransform: 'uppercase' }}>Modifiers:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {card.variants.map((v, i) => (
                          <span key={i} style={{ fontSize: '12px', background: '#edf2f7', padding: '2px 8px', borderRadius: '4px', color: '#4a5568' }}>{v}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Button 
                    onClick={() => handleEdit(card)} 
                    variant="secondary"
                  >
                    Edit
                  </Button>
                  <Button 
                    onClick={() => handleDelete(card.id)} 
                    variant="danger"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
