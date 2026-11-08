(function (root) {
  'use strict';

  function entries(grid, width, height) {
    const result = [];
    let number = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === '.') continue;
      const row = Math.floor(i / width);
      const col = i % width;
      const across = (col === 0 || grid[i - 1] === '.') && col + 1 < width && grid[i + 1] !== '.';
      const down = (row === 0 || grid[i - width] === '.') && row + 1 < height && grid[i + width] !== '.';
      if (!across && !down) continue;
      number++;
      for (const [direction, starts, step] of [['across', across, 1], ['down', down, width]]) {
        if (!starts) continue;
        const cells = [];
        for (let j = i; j < grid.length && grid[j] !== '.' &&
          (direction !== 'across' || Math.floor(j / width) === row); j += step) cells.push(j);
        result.push({ number, direction, start: i, cells });
      }
    }
    return result;
  }

  function checksum(bytes, initial = 0) {
    let sum = initial;
    for (const byte of bytes) {
      sum = ((sum >>> 1) | ((sum & 1) << 15));
      sum = (sum + byte) & 0xffff;
    }
    return sum;
  }

  function encode(text) {
    const bytes = [];
    for (const character of text) {
      const code = character.codePointAt(0);
      if (code === 0 || code > 255) {
        throw new Error('Text must use Latin-1 characters (no emoji or smart punctuation) for .puz compatibility.');
      }
      bytes.push(code);
    }
    return bytes;
  }

  function createPuz({ width, height, grid, clues, title = '', author = '', copyright = '', notes = '' }) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 7 || height > 7 ||
        !Array.isArray(grid) || grid.length !== width * height) {
      throw new Error('Grid dimensions must be whole numbers from 1 to 7.');
    }
    if (grid.some(cell => !/^[A-Z.]$/.test(cell))) {
      throw new Error('Fill every white square with a letter A–Z before downloading.');
    }
    const words = entries(grid, width, height);
    const covered = new Set(words.flatMap(word => word.cells));
    if (!words.length || grid.some((cell, i) => cell !== '.' && !covered.has(i))) {
      throw new Error('Each white square must belong to an across or down answer of at least two letters.');
    }
    const clueTexts = words.map(word => (clues[`${word.direction}-${word.start}`] || '').trim());
    if (clueTexts.some(text => !text)) throw new Error('Enter a clue for every across and down answer.');

    const solution = encode(grid.join(''));
    const fill = encode(grid.map(cell => cell === '.' ? '.' : '-').join(''));
    const metadata = [title, author, copyright].map(encode);
    const encodedClues = clueTexts.map(encode);
    const encodedNotes = encode(notes);
    const header = [width, height, words.length & 255, words.length >> 8, 1, 0, 0, 0];
    const zero = bytes => [...bytes, 0];
    const textChecksum = initial => {
      let sum = initial;
      for (const field of metadata) if (field.length) sum = checksum(zero(field), sum);
      for (const clue of encodedClues) if (clue.length) sum = checksum(clue, sum);
      if (encodedNotes.length) sum = checksum(zero(encodedNotes), sum);
      return sum;
    };
    const headerSum = checksum(header);
    const globalSum = textChecksum(checksum(fill, checksum(solution, headerSum)));
    const sums = [headerSum, checksum(solution), checksum(fill), textChecksum(0)];
    const output = new Uint8Array(52 + solution.length + fill.length +
      [...metadata, ...encodedClues, encodedNotes].reduce((total, field) => total + field.length + 1, 0));
    const view = new DataView(output.buffer);
    view.setUint16(0, globalSum, true);
    output.set(encode('ACROSS&DOWN'), 2);
    view.setUint16(14, headerSum, true);
    const mask = encode('ICHEATED');
    sums.forEach((sum, i) => {
      output[16 + i] = (sum & 255) ^ mask[i];
      output[20 + i] = (sum >> 8) ^ mask[i + 4];
    });
    output.set(encode('1.3'), 24);
    output.set(header, 44);
    let offset = 52;
    for (const field of [solution, fill, ...metadata.map(zero), ...encodedClues.map(zero), zero(encodedNotes)]) {
      output.set(field, offset);
      offset += field.length;
    }
    return output;
  }

  const api = { entries, createPuz };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Puzzle = api;
})(globalThis);
