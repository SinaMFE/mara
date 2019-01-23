import Logo from '../../components/Logo'

function render(container) {
  const content = `<div class="App">
    <header class="App-header">
      <div class="logo">${Logo()}</div>
      <p>Edit <code>src/app.js</code> and save to reload.</p>
      <a class="App-link" href="https://github.com/MostlyAdequate/mostly-adequate-guide" target="_blank" rel="noopener noreferrer">Learn Functional Programming</a>
    </header>
  </div>`

  if (container) container.innerHTML = content
}

export default render
