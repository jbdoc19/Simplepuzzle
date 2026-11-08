(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  let width = 7;
  let height = 7;
  let grid = Array(width * height).fill('');
  let clues = {};
  let blockMode = false;

  function renderClues() {
    const words = Puzzle.entries(grid, width, height);
    for (const direction of ['across', 'down']) {
      const container = byId(direction);
      container.replaceChildren();
      const matching = words.filter(word => word.direction === direction);
      if (!matching.length) container.textContent = 'No entries yet.';
      for (const word of matching) {
        const key = `${direction}-${word.start}`;
        const label = document.createElement('label');
        label.textContent = `${word.number}. (${word.cells.length} letters)`;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = clues[key] || '';
        input.addEventListener('input', () => { clues[key] = input.value; });
        label.append(input);
        container.append(label);
      }
    }
  }

  function renderGrid(focusIndex) {
    const container = byId('grid');
    container.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    container.replaceChildren();
    const numbers = new Map(Puzzle.entries(grid, width, height).map(word => [word.start, word.number]));
    grid.forEach((value, i) => {
      const cell = document.createElement('div');
      cell.className = value === '.' ? 'cell block' : 'cell';
      if (numbers.has(i)) {
        const number = document.createElement('span');
        number.textContent = numbers.get(i);
        cell.append(number);
      }
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.value = value === '.' ? '' : value;
      input.setAttribute('aria-label', `Row ${Math.floor(i / width) + 1}, column ${i % width + 1}${value === '.' ? ', black square' : ''}`);
      input.addEventListener('click', () => {
        if (blockMode || grid[i] === '.') toggleBlock(i);
      });
      input.addEventListener('keydown', event => {
        if (event.key === '#') {
          event.preventDefault();
          toggleBlock(i);
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const row = Math.floor(i / width);
          const col = i % width;
          const next = event.key === 'ArrowLeft' && col > 0 ? i - 1 :
            event.key === 'ArrowRight' && col < width - 1 ? i + 1 :
            event.key === 'ArrowUp' && row > 0 ? i - width :
            event.key === 'ArrowDown' && row < height - 1 ? i + width : i;
          container.querySelectorAll('input')[next].focus();
        }
      });
      input.addEventListener('input', () => {
        if (grid[i] === '.') { input.value = ''; return; }
        grid[i] = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
        input.value = grid[i];
      });
      cell.append(input);
      container.append(cell);
    });
    renderClues();
    if (focusIndex !== undefined) container.querySelectorAll('input')[focusIndex].focus();
  }

  function toggleBlock(index) {
    grid[index] = grid[index] === '.' ? '' : '.';
    renderGrid(index);
  }

  byId('block-mode').addEventListener('click', event => {
    blockMode = !blockMode;
    event.currentTarget.setAttribute('aria-pressed', String(blockMode));
    event.currentTarget.textContent = `Block tool: ${blockMode ? 'on' : 'off'}`;
  });
  byId('resize').addEventListener('click', () => {
    const newWidth = Number(byId('width').value);
    const newHeight = Number(byId('height').value);
    if (!Number.isInteger(newWidth) || !Number.isInteger(newHeight) || newWidth < 1 || newWidth > 7 || newHeight < 1 || newHeight > 7) {
      byId('status').textContent = 'Width and height must be whole numbers from 1 to 7.';
      return;
    }
    const newGrid = Array(newWidth * newHeight).fill('');
    const newClues = {};
    for (let row = 0; row < Math.min(height, newHeight); row++) {
      for (let col = 0; col < Math.min(width, newWidth); col++) {
        const oldIndex = row * width + col;
        const newIndex = row * newWidth + col;
        newGrid[newIndex] = grid[oldIndex];
        for (const direction of ['across', 'down']) {
          if (clues[`${direction}-${oldIndex}`]) newClues[`${direction}-${newIndex}`] = clues[`${direction}-${oldIndex}`];
        }
      }
    }
    width = newWidth;
    height = newHeight;
    grid = newGrid;
    clues = newClues;
    byId('status').textContent = '';
    renderGrid();
  });
  byId('save').addEventListener('click', () => {
    try {
      const data = Puzzle.createPuz({
        width, height, grid, clues,
        title: byId('title').value, author: byId('author').value,
        copyright: byId('copyright').value, notes: byId('notes').value
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/x-crossword' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = (byId('title').value.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'puzzle') + '.puz';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      byId('status').textContent = 'Your puzzle is ready to download.';
    } catch (error) {
      byId('status').textContent = error.message;
    }
  });
  renderGrid();
})();
