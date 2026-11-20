extends SelfTestPart
## Every def and every thing in this level uses keys SPEC.md lists, and SPEC.md lists every key the schema knows.


func run() -> void:
	var problems: Array = Schema.check_defs(LM.defs) + Schema.check_level(level.data)
	for w in problems:
		print("INFO  schema: ", w)
	say(problems.is_empty(), "the defs and this level's things use only keys SPEC.md lists (%d unknown)" % problems.size())
	var spec := FileAccess.get_file_as_string("res://SPEC.md")
	if spec != "":
		var missing := Schema.undocumented(spec)
		say(missing.is_empty(), "every key the schema checks is written in SPEC.md (%s)" % (", ".join(missing) if not missing.is_empty() else "all of them"))
