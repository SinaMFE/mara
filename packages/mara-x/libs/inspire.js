const { random } = require('./utils')

const quotes = [
  'First make it work, then make it right, and, finally, make it fast. - Kent Beck',
  `JavaScript is the world's most misunderstood programming language. - Douglas Crockford`,
  'The only way to learn a new programming language is by writing programs in it. - Dennis Ritchie',
  'We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. - Donald Knuth',
  'Deleted code is debugged code. - JEFF SICKEL',
  'Programs must be written for people to read, and only incidentally for machines to execute. - Hal Abelson',
  'Sometimes, the elegant implementation is a function. Not a method. Not a class. Not a framework. Just a function. - John Carmack',
  'You can’t trust code that you did not totally create yourself. - Ken Thompson',
  'Code is like humor. When you have to explain it, it’s bad. - Cory House',
  `The code you write makes you a programmer. The code you delete makes you a good one. The code you don't have to write makes you a great one. - Mario Fusco`,
  'Code never lies, comments sometimes do. - Ron Jeffries',
  `I'm not a great programmer; I'm just a good programmer with great habits. - Kent Beck`,
  'You do not really understand something unless you can explain it to your grandmother. - Albert Einstein',
  `Don't comment bad code ‐ rewrite it. - Brian W. Kernighan & P. J. Plaugher`,
  'Copy and paste is a design error. - David Parnas',
  'Before software can be reusable it first has to be usable. - Ralph Johnson',
  'In programming the hard part isn’t solving problems, but deciding what problems to solve. - Paul Graham',
  'All programming is maintenance programming, because you are rarely writing original code. - Dave Thomas',
  'What I cannot build, I do not understand. - Richard Feynman',
  'Marauder loves you. - Fish'
]

module.exports = {
  random() {
    return quotes[random(quotes.length - 1)]
  }
}
