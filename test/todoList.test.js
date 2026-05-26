'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TodoList = require('../src/todoList');

test('add() creates a new item with an incrementing id', () => {
  const todos = new TodoList();
  const a = todos.add('First');
  const b = todos.add('Second');

  assert.equal(a.id, 1);
  assert.equal(a.title, 'First');
  assert.equal(a.completed, false);
  assert.ok(a.createdAt instanceof Date);

  assert.equal(b.id, 2);
  assert.equal(b.title, 'Second');
});

test('add() trims whitespace from titles', () => {
  const todos = new TodoList();
  const item = todos.add('   hello world   ');
  assert.equal(item.title, 'hello world');
});

test('add() throws on invalid titles', () => {
  const todos = new TodoList();
  assert.throws(() => todos.add(''), /non-empty string/);
  assert.throws(() => todos.add('   '), /non-empty string/);
  assert.throws(() => todos.add(null), /non-empty string/);
  assert.throws(() => todos.add(42), /non-empty string/);
});

test('remove() deletes an existing item and returns true', () => {
  const todos = new TodoList();
  const item = todos.add('Delete me');
  assert.equal(todos.remove(item.id), true);
  assert.equal(todos.count(), 0);
});

test('remove() returns false for unknown ids', () => {
  const todos = new TodoList();
  todos.add('Keep me');
  assert.equal(todos.remove(999), false);
  assert.equal(todos.count(), 1);
});

test('complete() marks an item as completed', () => {
  const todos = new TodoList();
  const item = todos.add('Finish me');
  const updated = todos.complete(item.id);
  assert.equal(updated.completed, true);
});

test('complete() returns null when item is missing', () => {
  const todos = new TodoList();
  assert.equal(todos.complete(123), null);
});

test('uncomplete() reverts the completed flag', () => {
  const todos = new TodoList();
  const item = todos.add('Toggle me');
  todos.complete(item.id);
  const updated = todos.uncomplete(item.id);
  assert.equal(updated.completed, false);
});

test('get() returns the item or null', () => {
  const todos = new TodoList();
  const item = todos.add('Find me');
  assert.deepEqual(todos.get(item.id), item);
  assert.equal(todos.get(404), null);
});

test('list() supports filtering by completed flag', () => {
  const todos = new TodoList();
  const a = todos.add('A');
  const b = todos.add('B');
  todos.add('C');
  todos.complete(a.id);
  todos.complete(b.id);

  assert.equal(todos.list().length, 3);
  assert.equal(todos.list({ completed: true }).length, 2);
  assert.equal(todos.list({ completed: false }).length, 1);
});

test('list() returns a copy, not the internal array', () => {
  const todos = new TodoList();
  todos.add('A');
  const result = todos.list();
  result.push({ id: 999, title: 'evil', completed: false });
  assert.equal(todos.count(), 1);
});

test('clearCompleted() removes only completed items and returns the count', () => {
  const todos = new TodoList();
  const a = todos.add('A');
  todos.add('B');
  const c = todos.add('C');
  todos.complete(a.id);
  todos.complete(c.id);

  assert.equal(todos.clearCompleted(), 2);
  assert.equal(todos.count(), 1);
  assert.equal(todos.list()[0].title, 'B');
});

test('count() reflects the current size of the list', () => {
  const todos = new TodoList();
  assert.equal(todos.count(), 0);
  todos.add('A');
  todos.add('B');
  assert.equal(todos.count(), 2);
  todos.remove(1);
  assert.equal(todos.count(), 1);
});
