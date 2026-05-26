'use strict';

const TodoList = require('./todoList');

const todos = new TodoList();

todos.add('Buy groceries');
todos.add('Write tests');
todos.add('Read a book');

todos.complete(2);

console.log('All todos:');
for (const item of todos.list()) {
  const status = item.completed ? '[x]' : '[ ]';
  console.log(`  ${status} #${item.id} ${item.title}`);
}

console.log(`\nPending: ${todos.list({ completed: false }).length}`);
console.log(`Completed: ${todos.list({ completed: true }).length}`);
