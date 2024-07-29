class Block {
  constructor(type, moduleName) {
    this.type = type;
    this.moduleName = moduleName;
    this.id = crypto.randomUUID();
    this.children = [];
    this.parameters = [];
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      moduleName: this.moduleName,
      children: this.children.map((child) => child.serialize()),
    };
  }

  render() {
    throw new Error("Not implemented");
  }

  writeCode() {
    throw new Error("Not implemented");
  }
}

class ParameterHolder {
  constructor(id, name, value) {
    this.id = id;
    this.name = name;
    this.value = value;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      value: this.value ? this.value.serialize() : undefined,
    };
  }

  render() {
    const paramHolder = document.createElement("span");
    if (this.value !== undefined) {
      paramHolder.innerHTML = this.value.render().outerHTML;
    } else {
      paramHolder.classList.add("param-holder");
      paramHolder.textContent = this.name;
    }
    paramHolder.dataset.id = this.id;
    return paramHolder;
  }

  writeCode() {
    return this.value ? this.value.writeCode() : this.name;
  }
}

class FunctionBlock extends Block {
  constructor(module, name, parameters) {
    super("function", module);
    this.name = name;
    this.parameters = parameters.map(
      (param) =>
        new ParameterHolder(crypto.randomUUID(), param.name, param.value)
    );
  }

  serialize() {
    return {
      ...super.serialize(),
      name: this.name,
      parameters: this.parameters.map((param) => ({
        id: param.id,
        name: param.name,
        value: param.value,
      })),
    };
  }

  render() {
    const template = document.getElementById("block-template-function");
    const block = template.content.cloneNode(true).querySelector(".block");

    block.dataset.data = JSON.stringify(this.serialize());

    block.querySelector(".function-name").textContent = this.name;
    const parameterEl = block.querySelector(".parameters");
    for (let paramIdx = 0; paramIdx < this.parameters.length; paramIdx++) {
      let parameter = this.parameters[paramIdx];
      parameterEl.appendChild(parameter.render());

      if (paramIdx < this.parameters.length - 1) {
        parameterEl.appendChild(document.createTextNode(", "));
      }
    }

    return block;
  }

  writeCode() {
    let modulePrefix = this.moduleName ? `${this.moduleName}.` : "";
    let parameterString = this.parameters
      .map((param) => param.writeCode())
      .join(", ");
    return `${this.name}(${parameterString})`;
  }
}

class VariableBlock extends Block {
  constructor(name) {
    super("variable", undefined);
    this.name = name;
  }

  serialize() {
    return {
      ...super.serialize(),
      name: this.name,
    };
  }

  render() {
    const template = document.getElementById("block-template-variable");
    const block = template.content.cloneNode(true).querySelector(".block");

    block.dataset.data = JSON.stringify(this.serialize());

    block.querySelector(".variable-name").textContent = this.name;

    return block;
  }

  writeCode() {
    return this.name;
  }
}

class VariableAssignmentBlock extends Block {
  constructor(variable, value) {
    super("assign-variable", undefined);
    this.variable = variable;
    this.value = value;
  }

  serialize() {
    return {
      ...super.serialize(),
      variable: this.variable,
      value: this.value,
    };
  }

  render() {
    const template = document.getElementById("block-template-assign-variable");
    const block = template.content.cloneNode(true).querySelector(".block");

    block.dataset.data = JSON.stringify(this.serialize());

    const nameInput = block.querySelector(".variable-name-input");
    nameInput.onchange = (e) => {
      this.variable.name = e.target.value;
      renderWorkspace(program);
      renderProgram(program);
    };
    if (this.variable) {
      nameInput.value = this.variable.name;
    }

    const valueInput = block.querySelector(".variable-value-input");
    valueInput.onchange = (e) => {
      this.value = e.target.value;
      renderWorkspace(program);
      renderProgram(program);
    };
    if (this.value) {
      block.querySelector(".variable-value-input").value = this.value;
    }

    return block;
  }

  writeCode() {
    return `${this.variable.name} = ${this.value}`;
  }
}

class RangeForLoopBlock extends Block {
  constructor(loop_variable) {
    super("range-for-loop", undefined);
    this.loop_variable = loop_variable;
    this.start_variable = new ParameterHolder(
      crypto.randomUUID(),
      "start",
      undefined
    );
    this.end_variable = new ParameterHolder(
      crypto.randomUUID(),
      "end",
      undefined
    );
    this.parameters = [this.start_variable, this.end_variable];
  }

  serialize() {
    return {
      ...super.serialize(),
      variable: this.variable,
      start: this.start_variable.serialize(),
      end: this.end_variable.serialize(),
    };
  }

  render() {
    const template = document.getElementById("block-template-range-for-loop");
    const block = template.content.cloneNode(true).querySelector(".block");

    block.dataset.data = JSON.stringify(this.serialize());

    const nameInput = block.querySelector(".variable-name-input");
    nameInput.onchange = (e) => {
      this.loop_variable.name = e.target.value;
      renderWorkspace(program);
      renderProgram(program);
    };
    if (this.loop_variable) {
      nameInput.value = this.loop_variable.name;
    }

    const startParamHolder = block.querySelector(".param-holder-start");
    if (this.start_variable) {
      startParamHolder.innerHTML = this.start_variable.render().outerHTML;
    } else {
      startParamHolder.textContent = "start";
    }

    const endParamHolder = block.querySelector(".param-holder-end");
    // endParamHolder.dataset.id =
    if (this.end_variable) {
      endParamHolder.innerHTML = this.end_variable.render().outerHTML;
    } else {
      endParamHolder.textContent = "end";
    }

    let codeHolder = block.querySelector(".code-holder");
    if (this.children.length > 0) {
      codeHolder.querySelector(".no-code").style.display = "none";
      codeHolder.innerHTML = "";
      for (const child of this.children) {
        codeHolder.appendChild(child.render());
      }
    } else {
      codeHolder.querySelector(".no-code").style.display = "block";
    }

    block.ondragover = allowDrop;
    block.ondrop = dropBlock;

    return block;
  }

  writeCode() {
    const body = this.children.map((child) => child.writeCode()).join("\n  ");
    return `for ${
      this.loop_variable.name
    } in range(${this.start_variable.writeCode()}, ${this.end_variable.writeCode()}):\n  ${body}`;
  }
}

// sidebar

function addBlockToSidebar(module, block) {
  const renderedBlock = block.render();
  renderedBlock.ondragstart = dragFromSidebar;
  module.querySelector(".blocks").appendChild(renderedBlock);
}

function addModuleToSidebar(moduleData) {
  const template = document.getElementById("sidebar-module-template");
  const module = template.content.cloneNode(true).querySelector(".module");
  module.querySelector(".module-name").textContent = moduleData.name;

  // functions
  if (moduleData.functions) {
    for (const functionData of moduleData.functions) {
      const { name, parameters } = functionData;
      let functionBlock = new FunctionBlock(
        moduleData.name,
        name,
        parameters.map((param) => ({
          name: param,
          value: undefined,
        }))
      );
      addBlockToSidebar(module, functionBlock);
    }
  }

  // variables
  if (moduleData.variables) {
    for (const variableData of moduleData.variables) {
      const { name } = variableData;
      let variableBlock = new VariableBlock(name);
      addBlockToSidebar(module, variableBlock);
    }
  }

  document.getElementById("modules").appendChild(module);
}

let globalModule;
function addGlobalModule() {
  const template = document.getElementById("sidebar-module-template");
  globalModule = template.content.cloneNode(true).querySelector(".module");
  globalModule.querySelector(".module-name").textContent = "global";

  let variableAssignmentBlock = new VariableAssignmentBlock(
    undefined,
    undefined
  );
  addBlockToSidebar(globalModule, variableAssignmentBlock);

  let rangeForLoopBlock = new RangeForLoopBlock(undefined);
  addBlockToSidebar(globalModule, rangeForLoopBlock);

  let printBlock = new FunctionBlock(undefined, "print", [
    { name: "value", value: undefined },
  ]);
  addBlockToSidebar(globalModule, printBlock);

  document.getElementById("modules").appendChild(globalModule);
}

// load from /api
function loadModules() {
  addGlobalModule();

  fetch("/api")
    .then((response) => response.json())
    .then((data) => {
      for (const module of data) {
        addModuleToSidebar(module);
      }
    });
}

window.onload = loadModules;

function toggleModule(moduleHeader) {
  const module = moduleHeader.parentElement;
  module.classList.toggle("hidden");
}

// drag and drop

let program = [];
let variables = [];

function renderWorkspace(program) {
  document.getElementById("workspace").innerHTML = "";
  for (const block of program) {
    const blockElement = block.render();
    // add drag events
    for (let paramHolder of blockElement.querySelectorAll(".param-holder")) {
      paramHolder.ondragover = allowDrop;
      paramHolder.ondrop = dropParam;
    }
    document.getElementById("workspace").appendChild(blockElement);
  }

  // remove all variables, to be re-added after this
  for (const variableEl of globalModule.querySelectorAll(
    ".block[data-type='variable']"
  )) {
    variableEl.remove();
  }
  for (const variableBlock of variables) {
    addBlockToSidebar(globalModule, variableBlock);
  }
}

function renderProgram(program) {
  exportPython(program);
}

function resetDrag() {
  document.getElementById("workspace").classList.remove("drag-over");
  for (const paramHolder of document.querySelectorAll(".param-holder")) {
    paramHolder.classList.remove("drag-over");
  }
}

const DRAG_EVENT_TYPE = {
  NEW_BLOCK: "new-block",
  // MOVE_BLOCK: "move-block",
  USE_VARIABLE: "use-variable",
};

let dragEventData;

function dragFromSidebar(ev) {
  if (ev.target.dataset.type === "variable") {
    const blockData = JSON.parse(ev.target.dataset.data);
    let variable = variables.find((v) => v.id === blockData.id);
    dragEventData = {
      type: DRAG_EVENT_TYPE.USE_VARIABLE,
      variable: variable,
    };
  } else {
    dragEventData = {
      type: DRAG_EVENT_TYPE.NEW_BLOCK,
      block_data: JSON.parse(ev.target.dataset.data),
    };
  }
}

function allowDrop(ev) {
  ev.preventDefault();
  resetDrag();
  if (
    (ev.target.id === "workspace" ||
      ev.target.dataset.type === "range-for-loop") &&
    dragEventData.type === DRAG_EVENT_TYPE.NEW_BLOCK
  ) {
    ev.target.classList.add("drag-over");
  } else if (
    ev.target.classList.contains("param-holder") &&
    dragEventData.type === DRAG_EVENT_TYPE.USE_VARIABLE
  ) {
    ev.target.classList.add("drag-over");
  }
}

function getNewUnusedVariableName() {
  let i = 0;
  while (variables.find((v) => v.name === `var${i}`)) i++;
  return `var${i}`;
}

function createBlock(blockData) {
  let block;
  if (blockData.type === "function") {
    const { moduleName, name, parameters } = blockData;
    block = new FunctionBlock(moduleName, name, parameters);
  } else if (blockData.type === "assign-variable") {
    const { variable, value } = blockData;
    const variableBlock = new VariableBlock(getNewUnusedVariableName());
    variables.push(variableBlock);
    block = new VariableAssignmentBlock(variableBlock, value);
  } else if (blockData.type === "range-for-loop") {
    const loopVariable = new VariableBlock(getNewUnusedVariableName());
    block = new RangeForLoopBlock(loopVariable);
    variables.push(loopVariable);
  } else {
    throw new Error("Unknown block type", blockData);
  }
  return block;
}

function dropWorkspace(ev) {
  ev.preventDefault();
  resetDrag();

  if (ev.target.id !== "workspace") {
    return;
  }

  if (dragEventData.type === DRAG_EVENT_TYPE.NEW_BLOCK) {
    const blockData = dragEventData.block_data;
    block = createBlock(blockData);
    program.push(block);

    renderWorkspace(program);
    renderProgram(program);
  } else {
    console.error("Unknown drag event type", dragEventData);
  }
}

function findParamHolderById(id, blockList) {
  for (const block of blockList) {
    for (paramHolder of block.parameters) {
      if (paramHolder.id === id) return paramHolder;
    }

    const paramBlock = findParamHolderById(
      id,
      block.parameters
        .filter((param) => param.value)
        .map((param) => param.value)
        .concat(block.children)
    );
    if (paramBlock) return paramBlock;
  }
  return null;
}

function findBlock(id, blockList) {
  for (const block of blockList) {
    if (block.id === id) return block;

    const childBlock = findBlock(
      id,
      block.parameters
        .filter((param) => param.value)
        .map((param) => param.value)
        .concat(block.children)
    );
    if (childBlock) return childBlock;
  }
  return null;
}

function dropParam(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  resetDrag();

  if (dragEventData.type === DRAG_EVENT_TYPE.USE_VARIABLE) {
    const paramHolder = ev.target;
    const paramId = paramHolder.dataset.id;

    let block = findParamHolderById(paramId, program);
    if (block) {
      block.value = dragEventData.variable;
    }

    renderWorkspace(program);
    renderProgram(program);
  } else {
    console.error("Unknown drag event type", dragEventData);
  }
}

function dropBlock(ev) {
  ev.preventDefault();
  resetDrag();

  if (dragEventData.type === DRAG_EVENT_TYPE.NEW_BLOCK) {
    const blockData = dragEventData.block_data;
    block = createBlock(blockData);

    // get target block
    let eventTarget = ev.target;
    while (!eventTarget.dataset || !eventTarget.dataset.data) {
      eventTarget = eventTarget.parentElement;
    }
    const { id } = JSON.parse(eventTarget.dataset.data);
    let targetBlock = findBlock(id, program);

    // add block to target block
    targetBlock.children.push(block);

    renderWorkspace(program);
    renderProgram(program);
  } else {
    console.error("Unknown drag event type", dragEventData);
  }
}

function exportPython(program) {
  let code = "";

  // gather modules
  let modules = new Set();
  for (let block of program) {
    if (block.moduleName !== undefined) {
      modules.add(block.moduleName);
    }
  }
  modules = Array.from(modules).sort();
  for (let i = 0; i < modules.length; i++) {
    code += `import ${modules[i]}\n`;
  }

  code += "\n";

  for (let block of program) {
    code += block.writeCode() + "\n";
  }

  document.getElementById("python-code").textContent = code;
}

document.getElementById("workspace").ondrop = dropWorkspace;
document.getElementById("workspace").ondragover = allowDrop;
document.getElementById("workspace").ondragleave = resetDrag;
