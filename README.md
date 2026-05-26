# sample-tests

A tiny Node.js todo-list app used as a playground for tests.

## Project layout

```
src/
  todoList.js   # TodoList class (the unit under test)
  index.js      # Demo entry point
test/
  todoList.test.js
```

## Running

```sh
npm start      # run the demo
npm test       # run the test suite (uses node:test, no deps)
```

Requires Node.js 18+ (for the built-in `node:test` runner).
