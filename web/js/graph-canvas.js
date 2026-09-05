/**
 * Interactive Force-Directed Knowledge Graph Canvas Component
 * Provides Zoom, Pan, Drag, Node Selection, Edge Highlighting, and Tooltips
 */

const COLOR_MAP = {
  CASE: '#1E5A85',
  CrimeIncident: '#1E5A85',
  SUSPECT: '#2F7473',
  Suspect: '#2F7473',
  VEHICLE: '#B38B2E',
  Vehicle: '#B38B2E',
  LOCATION: '#9C4B59',
  Location: '#9C4B59',
  CRIME_TYPE: '#C27803',
  CrimeType: '#C27803',
  POLICE_BEAT: '#4A6B82',
  PoliceBeat: '#4A6B82',
  PoliceDistrict: '#3E586D',
  Ward: '#5C768D',
  CommunityArea: '#6E889E',
  PremiseType: '#8A7178',
  IUCRCode: '#556B2F',
  FBICode: '#483D8B'
};

export class GraphCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      onNodeSelect: null,
      onNodeDoubleClick: null,
      initialZoom: 1.0,
      showRelationshipLabels: true
    }, options);

    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    this.adj = new Map();

    // Viewport transform
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;

    // Interaction state
    this.isDragging = false;
    this.draggedNode = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.selectedNode = null;
    this.hoveredNode = null;
    this.hoveredEdge = null;

    // Animation physics
    this.animId = null;
    this.alpha = 1.0;

    this._setupCanvas();
    this._attachEvents();
  }

  _setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = Math.max(500, rect.height || 600);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  resize() {
    this._setupCanvas();
    this.render();
  }

  setData(data) {
    const rawNodes = data.nodes || [];
    const rawEdges = data.relationships || data.edges || [];

    this.nodeMap.clear();
    this.adj.clear();
    this.selectedNode = null;
    this.hoveredNode = null;

    // Center coordinates
    const cx = this.width / 2;
    const cy = this.height / 2;

    this.nodes = rawNodes.map((n, idx) => {
      const angle = (idx / Math.max(1, rawNodes.length)) * 2 * Math.PI;
      const radius = 60 + Math.random() * Math.min(cx, cy) * 0.75;
      const nodeObj = {
        id: n.id,
        label: n.label || n.id,
        type: n.type || 'UNKNOWN',
        properties: n.properties || {},
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: n.type === 'CASE' ? 14 : (n.type === 'SUSPECT' || n.type === 'VEHICLE' ? 12 : 10),
        color: COLOR_MAP[n.type] || '#5C768D'
      };
      this.nodeMap.set(n.id, nodeObj);
      this.adj.set(n.id, new Set());
      return nodeObj;
    });

    this.edges = [];
    for (const e of rawEdges) {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      if (this.nodeMap.has(src) && this.nodeMap.has(tgt)) {
        this.edges.push({
          source: this.nodeMap.get(src),
          target: this.nodeMap.get(tgt),
          relationship: e.relationship || e.type || 'CONNECTED',
          properties: e.properties || {}
        });
        this.adj.get(src).add(tgt);
        this.adj.get(tgt).add(src);
      }
    }

    this.alpha = 1.0;
    this.fitToScreen();
    this._startSimulation();
  }

  _startSimulation() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const step = () => {
      if (this.alpha > 0.005) {
        this._tickPhysics();
        this.alpha *= 0.96;
        this.render();
        this.animId = requestAnimationFrame(step);
      } else {
        this.alpha = 0;
        this.render();
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  _tickPhysics() {
    const kRepulse = 1800;
    const kAttract = 0.05;
    const naturalLen = 90;

    // Node repulsion
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 320) {
          const force = (kRepulse / (dist * dist)) * this.alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (n1 !== this.draggedNode) { n1.x -= fx; n1.y -= fy; }
          if (n2 !== this.draggedNode) { n2.x += fx; n2.y += fy; }
        }
      }
    }

    // Edge attraction
    for (const edge of this.edges) {
      const n1 = edge.source;
      const n2 = edge.target;
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - naturalLen) * kAttract * this.alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (n1 !== this.draggedNode) { n1.x += fx; n1.y += fy; }
      if (n2 !== this.draggedNode) { n2.x -= fx; n2.y -= fy; }
    }

    // Center gravitational pull
    const cx = this.width / 2;
    const cy = this.height / 2;
    for (const n of this.nodes) {
      if (n !== this.draggedNode) {
        n.x += (cx - n.x) * 0.01 * this.alpha;
        n.y += (cy - n.y) * 0.01 * this.alpha;
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    const isConnectedToSelected = (nodeId) => {
      if (!this.selectedNode) return true;
      if (this.selectedNode.id === nodeId) return true;
      const neighbors = this.adj.get(this.selectedNode.id);
      return neighbors && neighbors.has(nodeId);
    };

    // 1. Draw Edges
    for (const edge of this.edges) {
      const active = !this.selectedNode ||
        (edge.source.id === this.selectedNode.id || edge.target.id === this.selectedNode.id);

      this.ctx.beginPath();
      this.ctx.moveTo(edge.source.x, edge.source.y);
      this.ctx.lineTo(edge.target.x, edge.target.y);

      if (active) {
        this.ctx.strokeStyle = this.selectedNode ? '#1E5A85' : '#BCC7CF';
        this.ctx.lineWidth = this.selectedNode ? 2.5 : 1.2;
      } else {
        this.ctx.strokeStyle = '#E2E8EC';
        this.ctx.lineWidth = 0.8;
      }
      this.ctx.stroke();

      // Draw arrow towards target
      if (active) {
        this._drawArrow(edge.source.x, edge.source.y, edge.target.x, edge.target.y, edge.target.radius);
      }

      // Relationship label on active or zoom
      if (active && (this.scale > 0.85 || this.selectedNode) && this.options.showRelationshipLabels) {
        const mx = (edge.source.x + edge.target.x) / 2;
        const my = (edge.source.y + edge.target.y) / 2;
        this.ctx.save();
        this.ctx.font = '9px "IBM Plex Mono", monospace';
        this.ctx.fillStyle = active && this.selectedNode ? '#12304A' : '#7A858D';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(edge.relationship, mx, my - 4);
        this.ctx.restore();
      }
    }

    // 2. Draw Nodes
    for (const node of this.nodes) {
      const active = isConnectedToSelected(node.id);
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;
      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;

      this.ctx.save();

      // Outer glow/ring for selected or hovered
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(179, 139, 46, 0.25)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#B38B2E';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else if (isHovered) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius + 4, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(30, 90, 133, 0.15)';
        this.ctx.fill();
      }

      // Node Body Circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      this.ctx.fillStyle = active ? node.color : '#CFD8DF';
      this.ctx.fill();
      this.ctx.strokeStyle = isSelected ? '#B38B2E' : '#FFFFFF';
      this.ctx.lineWidth = isSelected ? 2.5 : 1.5;
      this.ctx.stroke();

      // Node Label
      if (active || isHovered || this.scale > 0.9) {
        this.ctx.font = isSelected ? 'bold 11px "Source Sans 3", sans-serif' : '10px "Source Sans 3", sans-serif';
        this.ctx.fillStyle = isSelected ? '#12304A' : (active ? '#17212B' : '#8C9AA6');
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // Shorten label for clean readability
        let displayLabel = node.label;
        if (displayLabel.length > 20) {
          displayLabel = displayLabel.substring(0, 18) + '...';
        }
        this.ctx.fillText(displayLabel, node.x, node.y + node.radius + 4);
      }

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  _drawArrow(fromX, fromY, toX, toY, targetRadius) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLen = 7;
    const endX = toX - (targetRadius + 2) * Math.cos(angle);
    const endY = toY - (targetRadius + 2) * Math.sin(angle);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLen * Math.cos(angle - Math.PI / 6),
      endY - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      endX - arrowLen * Math.cos(angle + Math.PI / 6),
      endY - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fillStyle = this.selectedNode ? '#1E5A85' : '#8CA0B2';
    this.ctx.fill();
    this.ctx.restore();
  }

  _screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  _findNodeAt(screenX, screenY) {
    const { x, y } = this._screenToWorld(screenX, screenY);
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
        return n;
      }
    }
    return null;
  }

  _attachEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      const hitNode = this._findNodeAt(pos.x, pos.y);

      if (hitNode) {
        this.draggedNode = hitNode;
        this.selectedNode = hitNode;
        if (this.options.onNodeSelect) {
          this.options.onNodeSelect(hitNode);
        }
      } else {
        this.isDragging = true;
        this.dragStartX = pos.x - this.offsetX;
        this.dragStartY = pos.y - this.offsetY;
      }
      this.render();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getPos(e);

      if (this.draggedNode) {
        const world = this._screenToWorld(pos.x, pos.y);
        this.draggedNode.x = world.x;
        this.draggedNode.y = world.y;
        this.alpha = Math.max(this.alpha, 0.1);
        this._startSimulation();
      } else if (this.isDragging) {
        this.offsetX = pos.x - this.dragStartX;
        this.offsetY = pos.y - this.dragStartY;
        this.render();
      } else {
        const hit = this._findNodeAt(pos.x, pos.y);
        if (hit !== this.hoveredNode) {
          this.hoveredNode = hit;
          this.canvas.style.cursor = hit ? 'pointer' : 'grab';
          this.render();
        }
      }
    });

    const stopDrag = () => {
      this.isDragging = false;
      this.draggedNode = null;
    };
    this.canvas.addEventListener('mouseup', stopDrag);
    this.canvas.addEventListener('mouseleave', stopDrag);

    // Zoom on Wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pos = getPos(e);
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.max(0.2, Math.min(4.0, this.scale * zoomFactor));

      this.offsetX = pos.x - (pos.x - this.offsetX) * (newScale / this.scale);
      this.offsetY = pos.y - (pos.y - this.offsetY) * (newScale / this.scale);
      this.scale = newScale;
      this.render();
    }, { passive: false });

    // Double click to focus
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getPos(e);
      const hit = this._findNodeAt(pos.x, pos.y);
      if (hit && this.options.onNodeDoubleClick) {
        this.options.onNodeDoubleClick(hit);
      }
    });
  }

  zoomIn() {
    this.scale = Math.min(4.0, this.scale * 1.2);
    this.render();
  }

  zoomOut() {
    this.scale = Math.max(0.2, this.scale * 0.8);
    this.render();
  }

  fitToScreen() {
    if (!this.nodes.length) {
      this.scale = 1.0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.render();
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const n of this.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const pad = 60;
    const graphW = Math.max(100, maxX - minX + pad * 2);
    const graphH = Math.max(100, maxY - minY + pad * 2);

    const scaleX = this.width / graphW;
    const scaleY = this.height / graphH;
    this.scale = Math.min(1.5, Math.max(0.45, Math.min(scaleX, scaleY)));

    this.offsetX = (this.width - (minX + maxX) * this.scale) / 2;
    this.offsetY = (this.height - (minY + maxY) * this.scale) / 2;
    this.render();
  }

  focusNode(nodeId) {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;
    this.selectedNode = node;
    this.scale = 1.2;
    this.offsetX = this.width / 2 - node.x * this.scale;
    this.offsetY = this.height / 2 - node.y * this.scale;
    this.render();
    if (this.options.onNodeSelect) {
      this.options.onNodeSelect(node);
    }
  }

  reset() {
    this.selectedNode = null;
    this.hoveredNode = null;
    this.fitToScreen();
  }
}
