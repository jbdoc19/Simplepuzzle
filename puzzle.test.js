const test = require('node:test');
const assert = require('node:assert/strict');
const { entries, createPuz } = require('./puzzle.js');

const puzzle = {
  width: 3, height: 2, grid: [...'AB.CDE'],
  title: 'Café', author: 'Author', copyright: '', notes: 'Notes',
  clues: {
    'across-0': 'Across one', 'down-0': 'Down one',
    'down-1': 'Down two', 'across-3': 'Across three'
  }
};

test('numbers entries in grid order, across before down', () => {
  assert.deepEqual(entries(puzzle.grid, 3, 2).map(({ number, direction, cells }) => [number, direction, cells]), [
    [1, 'across', [0, 1]], [1, 'down', [0, 3]],
    [2, 'down', [1, 4]], [3, 'across', [3, 4, 5]]
  ]);
});

test('exports bytes matching a reference Across Lite writer', () => {
  const expected = '5e984143524f535326444f574e00004e49c010ea0ffcfddc312e330000000000000000000000000000000000030204000100000041422e4344452d2d2e2d2d2d436166e900417574686f7200004163726f7373206f6e6500446f776e206f6e6500446f776e2074776f004163726f7373207468726565004e6f74657300';
  assert.equal(Buffer.from(createPuz(puzzle)).toString('hex'), expected);
});

test('supports the maximum grid size', () => {
  const grid = Array(49).fill('A');
  const clues = Object.fromEntries(entries(grid, 7, 7).map(word => [`${word.direction}-${word.start}`, 'Clue']));
  const bytes = createPuz({ width: 7, height: 7, grid, clues });
  assert.equal(bytes[44], 7);
  assert.equal(bytes[45], 7);
  assert.equal(bytes[46], 14);
});

test('rejects invalid grids, missing clues and unsupported text', () => {
  assert.throws(() => createPuz({ ...puzzle, width: 8 }), /dimensions/);
  assert.throws(() => createPuz({ ...puzzle, grid: [...'AB.CD'] }), /dimensions/);
  assert.throws(() => createPuz({ ...puzzle, grid: [...'AB.CD', ''] }), /Fill every/);
  assert.throws(() => createPuz({ ...puzzle, clues: {} }), /clue/);
  assert.throws(() => createPuz({ ...puzzle, title: 'Emoji 😀' }), /Latin-1/);
  assert.throws(() => createPuz({ ...puzzle, title: 'Bad\0title' }), /Latin-1/);
  assert.throws(() => createPuz({ width: 2, height: 2, grid: [...'A..B'], clues: {} }), /at least two/);
});
