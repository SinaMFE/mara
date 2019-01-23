import Logo from '../../components/Logo'

function render(container: Element | null) {
  const content = `<div class="App">
    <header class="App-header">
      <div class="logo">${Logo()}</div>
      <p>Edit <code>src/app.ts</code> and save to reload.</p>
      <a class="App-link" href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer">Learn Typescript</a>
    </header>
  </div>`

  if (container) container.innerHTML = content
}

export default render
