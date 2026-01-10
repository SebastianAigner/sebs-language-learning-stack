## Task: JPDB “new items remaining” count in progress bars

### Context

* There are two files in this directory: `decks.html` and `learn.html`.
* These files show the “overview of learning decks.”
* Learning decks have percentage values associated with them for:

  * **Known**
  * **In progress**
  * **New**
* This applies to both vocabulary and kanji.

### Goal

Create a **user script** that modifies the deck overview UI so that, **inside the existing progress bar**, it displays (right-aligned) the **absolute count** of items that are still **new** for that deck:

* absolute number of **new vocabulary** items remaining
* absolute number of **new kanji** items remaining

### Requirements

* The number must be placed **inside the progress bar**.
* The number must be **right-aligned** within the progress bar.
* The script must work on **both pages**:

  * `jpdb.io/deck-list`
  * `jpdb.io/learn`
* The **same user script** must work for both pages (one script, supports both).
