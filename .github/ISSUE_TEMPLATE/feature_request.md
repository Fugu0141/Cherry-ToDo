---
name: Feature request
description: Suggest an idea for Cherry-ToDo
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting an idea. Please explain the problem first, then the proposed solution.

  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
      description: Describe the user problem or frustration.
      placeholder: It is hard to find tasks without dates.
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
      description: Describe what you want Cherry-ToDo to do.
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
      description: Any other approaches?

  - type: textarea
    id: notes
    attributes:
      label: Additional context
      description: Screenshots, sketches, links, or examples can help.
