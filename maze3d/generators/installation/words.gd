extends RefCounted
## InstallationWords - the small grammar an installation's words are written in (defs "archetypes" and
## "contradictions": "words"). Each symbol is a list of lines; "#symbol#" in a line is one of that symbol's lines,
## itself expanded, picked from the stream given. No modifiers, no state: a symbol the words do not have is left as it
## is ("#symbol#"), so a line that still shows a "#" after expanding is a line written wrong.
class_name InstallationWords

const DEEPEST := 8               # symbols within symbols, at most
static var _re: RegEx


## `text` with every "#symbol#" put as one of that symbol's lines.
static func expand(text: String, symbols: Dictionary, rng: RandomNumberGenerator, depth := 0) -> String:
	if _re == null:
		_re = RegEx.create_from_string("#([A-Za-z_][A-Za-z0-9_]*)#")
	if depth > DEEPEST:
		return text
	var out := ""
	var at := 0
	for m in _re.search_all(text):
		out += text.substr(at, m.get_start() - at)
		var lines: Variant = symbols.get(m.get_string(1))
		if lines is Array and not (lines as Array).is_empty():
			out += InstallationWords.expand(str(Dice.pick(rng, lines)), symbols, rng, depth + 1)
		else:
			out += m.get_string()
		at = m.get_end()
	return out + text.substr(at)


## One line of a symbol, expanded ("" if the words have no such symbol).
static func line(symbol: String, symbols: Dictionary, rng: RandomNumberGenerator) -> String:
	return InstallationWords.expand("#%s#" % symbol, symbols, rng) if symbols.has(symbol) else ""
