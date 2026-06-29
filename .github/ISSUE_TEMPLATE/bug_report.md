---
name: Bug report
description: Report a problem in Cherry-ToDo
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug. Please include enough detail to reproduce it.

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Describe the problem.
      placeholder: A task moved to the wrong date when I dropped it on a boundary line.
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: What did you expect?
      description: Describe the expected behavior.
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: Write the steps as clearly as possible.
      placeholder: |
        1. Create a root task.
        2. Create a child task.
        3. Drag it to...
    validations:
      required: true

  - type: input
    id: browser
    attributes:
      label: Browser
      placeholder: Chrome 149 / Firefox / Safari / Edge

  - type: input
    id: device
    attributes:
      label: Device
      placeholder: PC / Android / iPhone / tablet

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots or videos
      description: Attach screenshots or short videos if useful.

  - type: textarea
    id: notes
    attributes:
      label: Additional notes
