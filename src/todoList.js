'use strict';

class TodoList {
  constructor() {
    this.items = [];
    this.nextId = 1;
  }

  add(title) {
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error('Title must be a non-empty string');
    }
    const item = {
      id: this.nextId++,
      title: title.trim(),
      completed: false,
      createdAt: new Date(),
    };
    this.items.push(item);
    return item;
  }

  remove(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }
    this.items.splice(index, 1);
    return true;
  }

  complete(id) {
    const item = this.items.find((item) => item.id === id);
    if (!item) {
      return null;
    }
    item.completed = true;
    return item;
  }

  uncomplete(id) {
    const item = this.items.find((item) => item.id === id);
    if (!item) {
      return null;
    }
    item.completed = false;
    return item;
  }

  get(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  list({ completed } = {}) {
    if (completed === undefined) {
      return [...this.items];
    }
    return this.items.filter((item) => item.completed === completed);
  }

  clearCompleted() {
    const before = this.items.length;
    this.items = this.items.filter((item) => !item.completed);
    return before - this.items.length;
  }

  count() {
    return this.items.length;
  }
}

module.exports = TodoList;
