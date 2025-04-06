 
  let fileInput;
  let curriculumData = []; // Datos del currículum (JSON)

  // Variables globales de nodos y para el arrastre en grupo
  let nodes = [];
  let selectedNode = null;
  let dragGroup = null; // Arreglo de objetos: { node, initX, initY }
  let dragStartX = 0;
  let dragStartY = 0;
  
  // Variables para el layout
  let margin = 20; // margen en el canvas
  let centerX, centerY, maxRadius;
  let R1, R2, R3; // radios para cada capa
  
  function handleFile(file) {
    // Validamos el tipo de archivo (puede ser "application/json" o "text")
    if (file.type === "application" || file.type === "application/json" || file.type === "text") {
      try {
        // Si file.data ya es un objeto, lo asignamos directamente, sino lo parseamos
        curriculumData = (typeof file.data === "object") ? file.data : JSON.parse(file.data);
        createGraph(); // Reconstruimos el grafo con los nuevos datos
      } catch (e) {
        console.error("Error al parsear el JSON:", e);
      }
    } else {
      console.error("Tipo de archivo no válido. Se requiere un archivo JSON.");
    }
  }



  function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100);
    noStroke();

    fileInput = createFileInput(handleFile);
    fileInput.hide();

    createGraph();
  }
  
  function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    createGraph(); // reubica los nodos en función del nuevo tamaño
  }
  
  // Clase que representa cada nodo en el grafo
  class Node {
    constructor(label, type, info = "", col = color(0)) {
      this.label = label;
      this.type = type; // "capstone", "category", "subcat", "course"
      this.info = info;
      this.col = col;
      this.x = 0;
      this.y = 0;
      if (type === "capstone") {
        this.r = 30;
      } else if (type === "category") {
        this.r = 25;
      } else if (type === "subcat") {
        this.r = 20;
      } else {
        this.r = 15;
      }
      this.parent = null;
      this.children = [];
    }
    
    display() {
      fill(this.col);
      ellipse(this.x, this.y, this.r * 1);
    }
    
    isMouseOver() {
      return dist(mouseX, mouseY, this.x, this.y) < this.r;
    }
  }
  
  // Construye el grafo y calcula posiciones (distribución en capas)
  function createGraph() {
    nodes = [];
    centerX = width / 2;
    centerY = height / 2;
    maxRadius = min(width, height) / 2 - margin;
    R1 = maxRadius / 4;       // categorías
    R2 = (2 * maxRadius) / 4;   // subcategorías
    R3 = maxRadius;           // cursos (extremos de la cadena)
    
    // Nodo central: Capstone (Taller 7)
    let capstoneCol = color(0, 80, 90);
    let capstone = new Node("Taller 7:\nEntretenimiento digital", "capstone", "", capstoneCol);
    capstone.x = centerX;
    capstone.y = centerY;
    nodes.push(capstone);
    
    // Categorías en la capa 1
    let numCategories = curriculumData.length;
    for (let i = 0; i < numCategories; i++) {
      let theta_cat = i * TWO_PI / numCategories;
      let catX = centerX + R1 * cos(theta_cat);
      let catY = centerY + R1 * sin(theta_cat);
      let catCol = color(map(i, 0, numCategories, 0, 360), 80, 90);
      let catNode = new Node(curriculumData[i].name, "category", "", catCol);
      catNode.x = catX;
      catNode.y = catY;
      catNode.parent = capstone;
      capstone.children.push(catNode);
      nodes.push(catNode);
      
      // Subcategorías en la capa 2
      let subcats = curriculumData[i].subcategories;
      let numSub = subcats.length;
      let wedge_cat = (TWO_PI / numCategories) * 0.8;
      for (let j = 0; j < numSub; j++) {
        let theta_subcat = (numSub === 1) 
                            ? theta_cat 
                            : theta_cat - wedge_cat / 2 + j * (wedge_cat / (numSub - 1));
        let subX = centerX + R2 * cos(theta_subcat);
        let subY = centerY + R2 * sin(theta_subcat);
        let subCol = color(hue(catCol), saturation(catCol) * 0.9, brightness(catCol) * 0.9);
        let subNode = new Node(subcats[j].name, "subcat", "", subCol);
        subNode.x = subX;
        subNode.y = subY;
        subNode.parent = catNode;
        catNode.children.push(subNode);
        nodes.push(subNode);
        
        // Cursos: se forman cadenas en orden inverso
        let courses = subcats[j].courses;
        let numCourses = courses.length;
        let courseSpacing = 20;
        let prevNode = subNode;
        for (let k = numCourses - 1; k >= 0; k--) {
          let courseX = prevNode.x + courseSpacing * cos(theta_subcat);
          let courseY = prevNode.y + courseSpacing * sin(theta_subcat);
          let courseCol = color(hue(subCol), saturation(subCol) * 0.8, brightness(subCol) * 0.8);
          let courseNode = new Node(courses[k].name, "course", courses[k].info, courseCol);
          courseNode.x = courseX;
          courseNode.y = courseY;
          courseNode.parent = prevNode;
          prevNode.children.push(courseNode);
          nodes.push(courseNode);
          prevNode = courseNode;
        }
      }
    }
  }
  
  // Dibuja las conexiones entre cada nodo y su padre
  function drawEdges() {
    stroke(255, 100);
    for (let n of nodes) {
      if (n.parent) {
        line(n.x, n.y, n.parent.x, n.parent.y);
      }
    }
  }
  
  function draw() {
    background(0);
    drawEdges();
    for (let n of nodes) {
      n.display();
    }
    
    // Muestra tooltip si el mouse está sobre un nodo
    for (let n of nodes) {
      if (n.isMouseOver()) {
        showTooltip(n);
        break;
      }
    }
  }
  
  // Muestra un cuadro con la información del nodo (tooltip)
  function showTooltip(node) {
    let infoText = node.label;
    if (node.info !== "") {
      infoText += "\n" + node.info;
    }
    textSize(12);
    let padding = 5;
    let boxW = textWidth(infoText) + padding * 2;
    let boxH = 40;
    let xPos = mouseX + 10;
    let yPos = mouseY + 10;
    
    fill(60, 20, 100);
    stroke(0);
    rect(xPos, yPos, boxW, boxH);
    
    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
    text(infoText, xPos + padding, yPos + padding);
  }
  
  // Función auxiliar: obtiene el subárbol (nodo y sus descendientes)
  function getSubtree(root) {
    let group = [];
    function traverse(n) {
      group.push({ node: n, initX: n.x, initY: n.y });
      for (let child of n.children) {
        traverse(child);
      }
    }
    traverse(root);
    return group;
  }
  
  function mousePressed() {
    for (let n of nodes) {
      if (n.isMouseOver()) {
        selectedNode = n;
        dragStartX = mouseX;
        dragStartY = mouseY;
        dragGroup = getSubtree(selectedNode);
        break;
      }
    }
  }
  
  function mouseDragged() {
    if (dragGroup) {
      let dx = mouseX - dragStartX;
      let dy = mouseY - dragStartY;
      
      // Calcula la caja delimitadora del grupo
      let xs = dragGroup.map(g => g.initX);
      let ys = dragGroup.map(g => g.initY);
      let groupMinX = Math.min(...xs);
      let groupMaxX = Math.max(...xs);
      let groupMinY = Math.min(...ys);
      let groupMaxY = Math.max(...ys);
      
      // Ajusta dx y dy para mantener el grupo dentro del canvas
      if (groupMinX + dx < margin) {
        dx = margin - groupMinX;
      }
      if (groupMaxX + dx > width - margin) {
        dx = (width - margin) - groupMaxX;
      }
      if (groupMinY + dy < margin) {
        dy = margin - groupMinY;
      }
      if (groupMaxY + dy > height - margin) {
        dy = (height - margin) - groupMaxY;
      }
      
      for (let g of dragGroup) {
        g.node.x = g.initX + dx;
        g.node.y = g.initY + dy;
      }
    }
  }
  
  function mouseReleased() {
    if (dragGroup) {
      for (let g of dragGroup) {
        g.initX = g.node.x;
        g.initY = g.node.y;
      }
    }
    selectedNode = null;
    dragGroup = null;
  }
  
  function keyPressed() {
    if (key === "s" || key === "S") {
      saveCanvas("curriculum_map", "png");
    } else if (key === "l" || key === "L") {
        // Simula un click en el input de archivo para cargar el JSON
        fileInput.elt.click();
    }
  }
  