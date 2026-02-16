skill:
	mkdir -p /tmp/staticstripes
	cp .claude/skills/staticstripes/SKILL.md /tmp/staticstripes/
	cd /tmp
	zip -r staticstripes.skill staticstripes/
	mv staticstripes.skill ~/.claude/skills/
	rm -rf /tmp/staticstripes
