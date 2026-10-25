# Sample todo app

A small todo list in plain HTML, CSS and JavaScript. No install, no build: open `index.html` in a browser.

It is the workshop's spare practice repo. If you have no repo of your own, `node mw.js init` copies
this folder to `~/maxwize-sample-todo`, makes it a git repo, and the "your repo" tasks happen there.

## Files

- `index.html`: the page.
- `app.js`: wires everything together on load.
- `controller.js`, `model.js`, `view.js`, `template.js`: the app, split model / view / controller.
- `store.js`: keeps the todos in memory, so they reset on reload.
- `helpers.js`: small DOM helpers (`qs`, `$on`, `$delegate`).
- `base.css`, `index.css`: the look.

## Where it comes from

The JavaScript ES5 example from [TodoMVC](https://github.com/tastejs/todomvc) (`examples/javascript-es5/dist`,
commit ff43b02), MIT License, see `LICENSE.md`. Removed: TodoMVC's `base.js`, which only adds the
todomvc.com sidebar and analytics.
