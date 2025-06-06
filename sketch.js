 
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

  // Variables para la animación
    let animationTriggered = false; // indica si ya presionamos "a" para iniciar
    let animating = false;          // indica si la transición está en curso
    let animationStartTime = 0;
    let animationDuration = 2000; // duración de la animación en ms
    let reset = false; // indica si se debe reiniciar la animación

  // Variables para feedback visual de carga
  let loadingFeedback = false;
  let loadingStartTime = 0;
  let loadingDuration = 100; // duración del feedback en ms

    // Variables para la fuente y puntos de la palabra "IDED"
    let myFont;
    let textPoints = [];

    // App state
    let appState = "initial"; // "initial", "animating", "final"

    // Carga la fuente en preload
    function preload() {
    // Asegúrate de tener la fuente en la carpeta "assets"
        myFont = loadFont('Orbitron-Bold.ttf'); 
    }
  
  
  function handleFile(file) {
    // Validamos el tipo de archivo (puede ser "application/json" o "text")
    if (file.type === "application" || file.type === "application/json" || file.type === "text") {
      try {
        // Si file.data ya es un objeto, lo asignamos directamente, sino lo parseamos
        curriculumData = (typeof file.data === "object") ? file.data : JSON.parse(file.data);
        createGraph(); // Reconstruimos el grafo con los nuevos datos
        prepararAnimacion();
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
    prepararAnimacion();
  }
  
  function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    createGraph(); // reubica los nodos en función del nuevo tamaño
    for (let n of nodes) {
        n.x = n.finalX;
        n.y = n.finalY;
        n.currentR = n.r;
        n.currentCol = n.col;
    }
  }
  
  class Node {
    constructor(label, type, info = "", col = color(0)) {
      this.label = label;
      this.type = type; // "capstone", "category", "subcat", "course"
      this.info = info;
      this.col = col;
      this.x = 0;
      this.y = 0;
      if (type === "capstone") {
        this.r = 25;
      } else if (type === "category") {
        this.r = 20;
      } else if (type === "subcat") {
        this.r = 15;
      } else {
        this.r = 10;
      }
      this.parent = null;
      this.children = [];

        // Propiedades para animación:
        this.currentR = 2;              // radio inicial (uniforme)
        this.currentCol = color(255);    // color inicial (blanco)
        this.startX = 0;
        this.startY = 0;
        this.finalX = 0;
        this.finalY = 0;

    }
    
    display() {
      fill(this.currentCol);
      ellipse(this.x, this.y, this.currentR * 1);
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
      
    // Guarda las posiciones definitivas
    for (let n of nodes) {
        n.finalX = n.x;
        n.finalY = n.y;
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

  // Genera los puntos de "IDED" y asigna posiciones iniciales
function prepararAnimacion() {
    let fontSize = 200;
    let bbox = myFont.textBounds("IDED", 0, 0, fontSize);
    let xText = width / 2 - bbox.w / 2;
    let yText = height / 2 + bbox.h / 2;
    
    textPoints = myFont.textToPoints("IDED", xText, yText, fontSize, {
      sampleFactor: 0.1
    });
    //console.log(textPoints.length);
    //console.log(nodes.length);

    for (let i = 0; i < nodes.length; i++) {
      let pt = textPoints[ floor((textPoints.length/nodes.length)*i) ];
      nodes[i].startX = pt.x;
      nodes[i].startY = pt.y;
      // Posición inicial = forma de "IDED"
      nodes[i].x = nodes[i].startX;
      nodes[i].y = nodes[i].startY;
      // Estado inicial: radio 3, color blanco
      nodes[i].currentR = 3;
      nodes[i].currentCol = color(255);
    }
  }
  
  function draw() {
    background(0);
    switch (appState) {
        case "initial":

            for(let i = 0; i< textPoints.length; i++){
                circle(textPoints[i].x,textPoints[i].y,2);
            }
            for (let n of nodes) {
                n.display();
            }

            if(animationTriggered===true){
                appState = "animating";
            }
            
            
        break;

        case "loading":
            // Estado de feedback visual después de cargar datos
            let loadingElapsed = millis() - loadingStartTime;
            let loadingProgress = constrain(loadingElapsed / loadingDuration, 0, 1);
            
            // Efecto de pulso en el brillo
            let pulseSpeed = 6; // velocidad del pulso
            let brightness = 50 + 50 * sin(loadingElapsed * pulseSpeed * 0.01);
            
            // Mostrar puntos de texto con tamaño aumentado
            for(let i = 0; i < textPoints.length; i++){
                fill(255, brightness);
                circle(textPoints[i].x, textPoints[i].y, 6); // tamaño aumentado
            }
            
            // Mostrar nodos con efecto de pulso
            for (let n of nodes) {
                // Radio aumentado con pulso
                n.currentR = 8 + 3 * sin(loadingElapsed * pulseSpeed * 0.01);
                // Color con brillo pulsante
                n.currentCol = color(255, brightness);
                n.display();
            }
            
            // Finalizar el feedback y volver al estado inicial
            if (loadingProgress >= 1) {
                loadingFeedback = false;
                appState = "initial";
                // Resetear propiedades de los nodos
                for (let n of nodes) {
                    n.currentR = 3;
                    n.currentCol = color(255);
                }
            }
        break;

        case "animating":
            // Estamos en transición: interpolamos
            let elapsed = millis() - animationStartTime;
            let t = constrain(elapsed / animationDuration, 0, 1);
            for (let n of nodes) {
                n.x = lerp(n.startX, n.finalX, t);
                n.y = lerp(n.startY, n.finalY, t);
                n.currentR = lerp(2, n.r, t);
                n.currentCol = lerpColor(color(255), n.col, t);
            }
            // Al finalizar la animación
            if (t === 1) {
                animating = false;
                animationTriggered = false; 
                appState = "final"; // Cambia el estado a "final"
            }
            drawEdges();
            for (let n of nodes) {
                n.display();
            }

        break;
        case "final":
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
            
            if(reset===true){
                reset = false; // Reinicia el estado
                prepararAnimacion();
                appState = "initial";
            }
        break;

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
    
    //fill(60, 20, 100);
    fill('rgb(0, 140, 255)');
    stroke(0);
    rect(xPos, yPos, boxW, boxH);
    
    fill(0);
    //fill(255);
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
  

function loadCurriculumFile(fileName) {
  console.log(`Intentando cargar ${fileName}...`);
  loadJSON(fileName, 
    (data) => { // Función de callback para éxito
      if (data) {
        curriculumData = data;
        createGraph();      // Reconstruir el grafo con los nuevos datos
        prepararAnimacion();  // Preparar las posiciones iniciales para la animación
        console.log(`${fileName} cargado exitosamente y grafo reinicializado.`);
        //animationTriggered = true;
        //animating = true;
        //animationStartTime = millis();
        loadingFeedback = true;
        loadingStartTime = millis();
        appState = "loading";
      } else {
        console.error(`Error: ${fileName} está vacío o no es un JSON válido.`);
      }
    }, 
    (error) => { // Función de callback para error
      console.error(`Error al cargar ${fileName}:`, error);
    }
  );
}

  function keyPressed() {
    if (key === "a" || key === "A") {
        if (!animationTriggered) {
          animationTriggered = true;
          animating = true;
          animationStartTime = millis();
        }
    } else if (key === "s" || key === "S") {
      saveCanvas("curriculum_map", "png");
    } else if (key === "l" || key === "L") {
        // Simula un click en el input de archivo para cargar el JSON
        fileInput.elt.click();
    } else if (key === "r" || key === "R") {
        reset = true; // Cambia el estado a "reset"
    } else if (appState === "initial") {
        const fileMap = {
          '1': 'curriculumDominios1.json',
          '2': 'curriculumDominios2.json'
        };
        if (fileMap[key]) {
          loadCurriculumFile(fileMap[key]);
        }
      }
  }
  