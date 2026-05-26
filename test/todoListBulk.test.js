'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TodoList = require('../src/todoList');

test('bulk add: 15 items get sequential ids and are all present', () => {
  const todos = new TodoList();
  const items = [];
  for (let i = 1; i <= 15; i++) {
    items.push(todos.add(`Task ${i}`));
  }

  assert.equal(todos.count(), 15);
  items.forEach((item, idx) => {
    assert.equal(item.id, idx + 1);
    assert.equal(item.title, `Task ${idx + 1}`);
    assert.equal(item.completed, false);
  });
});

test('bulk remove: removing 12 of 20 items leaves the rest intact', () => {
  const todos = new TodoList();
  for (let i = 1; i <= 20; i++) {
    todos.add(`Item ${i}`);
  }
  assert.equal(todos.count(), 20);

  for (let id = 1; id <= 12; id++) {
    assert.equal(todos.remove(id), true);
  }

  assert.equal(todos.count(), 8);
  const remainingIds = todos.list().map((item) => item.id);
  assert.deepEqual(remainingIds, [13, 14, 15, 16, 17, 18, 19, 20]);
});

test('bulk add then remove all: list ends empty', () => {
  const todos = new TodoList();
  const ids = [];
  for (let i = 1; i <= 25; i++) {
    ids.push(todos.add(`T${i}`).id);
  }
  assert.equal(todos.count(), 25);

  for (const id of ids) {
    assert.equal(todos.remove(id), true);
  }
  assert.equal(todos.count(), 0);
  assert.deepEqual(todos.list(), []);
});

test('bulk remove of unknown ids returns false and does not mutate the list', () => {
  const todos = new TodoList();
  for (let i = 1; i <= 10; i++) {
    todos.add(`Real ${i}`);
  }

  for (let id = 1000; id < 1015; id++) {
    assert.equal(todos.remove(id), false);
  }
  assert.equal(todos.count(), 10);
});

test('interleaved bulk add/remove: ids keep incrementing after removals', () => {
  const todos = new TodoList();
  const created = [];
  for (let i = 1; i <= 10; i++) {
    created.push(todos.add(`A${i}`));
  }

  // Remove the first 5
  for (let i = 0; i < 5; i++) {
    todos.remove(created[i].id);
  }
  assert.equal(todos.count(), 5);

  // Add 8 more — ids should continue from 11
  const more = [];
  for (let i = 0; i < 8; i++) {
    more.push(todos.add(`B${i}`));
  }
  assert.equal(todos.count(), 13);
  more.forEach((item, idx) => {
    assert.equal(item.id, 11 + idx);
  });
});

test('bulk add then clearCompleted removes every completed item at once', () => {
  const todos = new TodoList();
  const items = [];
  for (let i = 1; i <= 12; i++) {
    items.push(todos.add(`C${i}`));
  }

  // Complete the even-indexed ones (6 items)
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      todos.complete(item.id);
    }
  });

  assert.equal(todos.clearCompleted(), 6);
  assert.equal(todos.count(), 6);
  for (const remaining of todos.list()) {
    assert.equal(remaining.completed, false);
  }
});
