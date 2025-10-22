// Word matching logic

function wordMatchesWithCounts(word, parsed) {
  // Check green letters first (must match exactly)
  for (let i = 0; i < 5; i++) {
    if (parsed.constraints.correct[i] && word[i] !== parsed.constraints.correct[i]) {
      return false;
    }
  }

  // Build letter frequency map for the word
  const letterCounts = {};
  for (const ch of word) {
    letterCounts[ch] = (letterCounts[ch] || 0) + 1;
  }

  // Check letter counts against constraints
  for (const letter in parsed.minCounts) {
    const count = letterCounts[letter] || 0;
    if (count < parsed.minCounts[letter]) return false;
    if (parsed.maxCounts[letter] !== undefined && count > parsed.maxCounts[letter]) return false;
  }

  // Check yellow letter positions
  for (const [letter, positions] of Object.entries(parsed.constraints.presentPositions)) {
    // Letter must exist in word
    if (!word.includes(letter)) return false;

    // Letter can't be in forbidden positions
    for (const pos of positions) {
      if (word[pos] === letter) return false;
    }
  }

  // Check absent letters
  for (const letter of parsed.constraints.absent) {
    if (word.includes(letter)) return false;
  }

  // Additional check for optimal yellow letter placement
  for (const [letter, info] of Object.entries(parsed.letterInfo)) {
    if (info.yellowPositions.size > 0) {
      const availablePositions = new Set([0,1,2,3,4]);
      for (const pos of info.greenPositions) availablePositions.delete(pos);
      for (const pos of info.yellowPositions) availablePositions.delete(pos);

      if (availablePositions.size === 1 && letterCounts[letter] === 1) {
        const mustBePosition = Array.from(availablePositions)[0];
        if (word[mustBePosition] !== letter) return false;
      }
    }
  }

  return true;
}

export { wordMatchesWithCounts };