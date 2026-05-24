/**
 * PlotterAPI v3.0.0
 * Biblioteca completa para visualização matemática, álgebra linear e análise numérica.
 * Projetada para o CalcN Studio — ferramenta de estudo de Cálculo Numérico.
 *
 * SEÇÕES:
 *   1. Geometria Analítica 3D (GA)
 *   2. Sólidos (Poliedros)
 *   3. Projeções e Interseções
 *   4. Álgebra Linear e Matrizes
 *   5. Cálculo Numérico
 *      5a. Derivação e Integração Numérica
 *      5b. Interpolação
 *      5c. Zeros de Funções (Root Finding)
 *      5d. EDOs (Métodos de passo único)
 *      5e. Sistemas Lineares Iterativos
 *   6. Utilitários e Conveniência
 *   7. Renderização 2D
 *   8. Renderização 3D
 *   9. Debug e Validação
 */

// ─── Guard ───────────────────────────────────────────────────
if (typeof window !== "undefined" && window.__PlotterAPI_v3_loaded) {
  console.warn("[PlotterAPI] v3 já carregado — ignorando redefinição.");
}

// ─── Constante interna ───────────────────────────────────────
const _API = {};

// ════════════════════════════════════════════════════════════
// § 1  GEOMETRIA ANALÍTICA 3D
// ════════════════════════════════════════════════════════════

/**
 * Cria um ponto no espaço 3D.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{ type: 'point3D', coords: [number,number,number] }}
 */
_API.point3D = (x, y, z) => ({ type: "point3D", coords: [+x, +y, +z] });

/**
 * Cria um ponto no plano 2D.
 * @param {number} x
 * @param {number} y
 * @returns {{ type: 'point2D', coords: [number,number] }}
 */
_API.point2D = (x, y) => ({ type: "point2D", coords: [+x, +y] });

/**
 * Cria um vetor 3D com origem opcional.
 * @param {number} dx  Componente x da direção
 * @param {number} dy  Componente y da direção
 * @param {number} dz  Componente z da direção
 * @param {number} [ox=0]  Origem x
 * @param {number} [oy=0]  Origem y
 * @param {number} [oz=0]  Origem z
 */
_API.vector3D = (dx, dy, dz, ox = 0, oy = 0, oz = 0) => ({
  type: "vector3D",
  dir: [+dx, +dy, +dz],
  origin: [+ox, +oy, +oz],
});

/**
 * Cria uma reta 3D por ponto e vetor diretor.
 * @param {[number,number,number]} p0  Ponto na reta
 * @param {[number,number,number]} dir Vetor diretor
 */
_API.line3D = (p0, dir) => ({ type: "line3D", p0: [...p0], dir: [...dir] });

/**
 * Cria um plano 3D pela equação ax + by + cz + d = 0.
 */
_API.plane3D = (a, b, c, d) => ({ type: "plane3D", eq: [+a, +b, +c, +d] });

/**
 * Cria um vetor n-dimensional.
 * @param {number}   dimension  Dimensão do espaço
 * @param {number[]} coords     Componentes
 */
_API.vector = (dimension, coords) => {
  if (!Array.isArray(coords))
    throw new Error("vector(): coords deve ser um array");
  return { type: "vector", dim: dimension, data: coords.map(Number) };
};

// ─── Operações Vetoriais 3D ──────────────────────────────────

/** Módulo (comprimento) de um vetor3D ou array [x,y,z]. */
_API.vectorMag = (v) => {
  const d = v.dir || v.data || v;
  return Math.sqrt(d.reduce((s, x) => s + x * x, 0));
};

/** Produto escalar de dois vetores3D ou arrays. */
_API.vectorDot = (v1, v2) => {
  const a = v1.dir || v1.data || v1;
  const b = v2.dir || v2.data || v2;
  return a.reduce((s, x, i) => s + x * b[i], 0);
};

/** Produto vetorial de dois vetores3D ou arrays [x,y,z]. Retorna array [x,y,z]. */
_API.vectorCross = (v1, v2) => {
  const [ax, ay, az] = v1.dir || v1.data || v1;
  const [bx, by, bz] = v2.dir || v2.data || v2;
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
};

/** Normaliza um vetor3D ou array para comprimento 1. Retorna array. */
_API.vectorNorm = (v) => {
  const d = v.dir || v.data || v;
  const mag = _API.vectorMag(v) || 1;
  return d.map((x) => x / mag);
};

/** Ângulo em graus entre dois vetores. */
_API.angleBetween = (v1, v2) => {
  const dot = _API.vectorDot(v1, v2);
  const mags = _API.vectorMag(v1) * _API.vectorMag(v2);
  if (mags < 1e-14) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mags))) * 180) / Math.PI;
};

/** Distância com sinal de um ponto ao plano ax+by+cz+d=0. */
_API.distancePointPlane = (pt, plane) => {
  const [px, py, pz] = pt.coords || pt;
  const [a, b, c, d] = plane.eq;
  return (a * px + b * py + c * pz + d) / Math.sqrt(a * a + b * b + c * c);
};

/** Distância euclidiana entre dois pontos3D. */
_API.distancePoints = (p1, p2) => {
  const [x1, y1, z1] = p1.coords || p1;
  const [x2, y2, z2] = p2.coords || p2;
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
};

// ════════════════════════════════════════════════════════════
// § 2  SÓLIDOS
// ════════════════════════════════════════════════════════════

/** Cria um poliedro genérico a partir de vértices e faces. */
_API.polyhedron = (vertices, faces) => ({
  type: "polyhedron",
  vertices,
  faces,
});

/** Cubo centralizado. @param {number} [size=2] @param {[number,number,number]} [center=[0,0,0]] */
_API.cube = (size = 2, center = [0, 0, 0]) => {
  const s = size / 2,
    [cx, cy, cz] = center;
  const v = [
    [cx - s, cy - s, cz - s],
    [cx + s, cy - s, cz - s],
    [cx + s, cy + s, cz - s],
    [cx - s, cy + s, cz - s],
    [cx - s, cy - s, cz + s],
    [cx + s, cy - s, cz + s],
    [cx + s, cy + s, cz + s],
    [cx - s, cy + s, cz + s],
  ];
  return {
    type: "polyhedron",
    vertices: v,
    faces: [
      [0, 1, 2, 3],
      [5, 4, 7, 6],
      [4, 0, 3, 7],
      [1, 5, 6, 2],
      [4, 5, 1, 0],
      [3, 2, 6, 7],
    ],
  };
};

/** Paralelepípedo (caixa retangular). */
_API.box = (w = 2, h = 2, d = 2, center = [0, 0, 0]) => {
  const [cx, cy, cz] = center,
    hw = w / 2,
    hh = h / 2,
    hd = d / 2;
  const v = [
    [cx - hw, cy - hh, cz - hd],
    [cx + hw, cy - hh, cz - hd],
    [cx + hw, cy + hh, cz - hd],
    [cx - hw, cy + hh, cz - hd],
    [cx - hw, cy - hh, cz + hd],
    [cx + hw, cy - hh, cz + hd],
    [cx + hw, cy + hh, cz + hd],
    [cx - hw, cy + hh, cz + hd],
  ];
  return {
    type: "polyhedron",
    vertices: v,
    faces: [
      [0, 1, 2, 3],
      [5, 4, 7, 6],
      [4, 0, 3, 7],
      [1, 5, 6, 2],
      [4, 5, 1, 0],
      [3, 2, 6, 7],
    ],
  };
};

/** Esfera aproximada por poliedro. */
_API.sphere = (radius = 1, center = [0, 0, 0], segments = 16) => {
  const vertices = [],
    faces = [];
  const [cx, cy, cz] = center;
  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI;
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * 2 * Math.PI;
      vertices.push([
        cx + radius * Math.sin(phi) * Math.cos(theta),
        cy + radius * Math.cos(phi),
        cz + radius * Math.sin(phi) * Math.sin(theta),
      ]);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const p1 = i * (segments + 1) + j,
        p2 = p1 + 1,
        p3 = (i + 1) * (segments + 1) + j + 1,
        p4 = (i + 1) * (segments + 1) + j;
      faces.push([p1, p2, p3, p4]);
    }
  }
  return { type: "polyhedron", vertices, faces };
};

/** Cilindro. */
_API.cylinder = (radius = 1, height = 2, center = [0, 0, 0], segments = 16) => {
  const vertices = [],
    faces = [];
  const [cx, cy, cz] = center,
    h2 = height / 2;
  // índices 0 = topo, 1 = base
  vertices.push([cx, cy + h2, cz]);
  vertices.push([cx, cy - h2, cz]);
  const offset = 2;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const x = cx + radius * Math.cos(theta),
      z = cz + radius * Math.sin(theta);
    vertices.push([x, cy + h2, z]);
    vertices.push([x, cy - h2, z]);
  }
  for (let i = 0; i < segments; i++) {
    const t1 = offset + i * 2,
      b1 = offset + i * 2 + 1,
      t2 = offset + (i + 1) * 2,
      b2 = offset + (i + 1) * 2 + 1;
    faces.push([t1, b1, b2, t2]); // lateral
    faces.push([0, t2, t1]); // tampa topo (ordem CW para outward)
    faces.push([1, b1, b2]); // tampa base
  }
  return { type: "polyhedron", vertices, faces };
};

/** Cone. */
_API.cone = (radius = 1, height = 2, center = [0, 0, 0], segments = 16) => {
  const vertices = [],
    faces = [];
  const [cx, cy, cz] = center,
    h2 = height / 2;
  vertices.push([cx, cy + h2, cz]); // ápice = índice 0
  vertices.push([cx, cy - h2, cz]); // centro base = índice 1
  const offset = 2;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    vertices.push([
      cx + radius * Math.cos(theta),
      cy - h2,
      cz + radius * Math.sin(theta),
    ]);
  }
  for (let i = 0; i < segments; i++) {
    const b1 = offset + i,
      b2 = offset + i + 1;
    faces.push([0, b1, b2]); // lateral (ápice → anel)
    faces.push([1, b2, b1]); // base (sentido correto)
  }
  return { type: "polyhedron", vertices, faces };
};

/** Toro (rosquinha). @param {number} R Raio maior @param {number} r Raio do tubo */
_API.torus = (
  R = 2,
  r = 0.5,
  center = [0, 0, 0],
  segments = 24,
  tubeSegments = 12,
) => {
  const vertices = [],
    faces = [];
  const [cx, cy, cz] = center;
  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * 2 * Math.PI;
    for (let j = 0; j <= tubeSegments; j++) {
      const v = (j / tubeSegments) * 2 * Math.PI;
      vertices.push([
        cx + (R + r * Math.cos(v)) * Math.cos(u),
        cy + r * Math.sin(v),
        cz + (R + r * Math.cos(v)) * Math.sin(u),
      ]);
    }
  }
  const ring = tubeSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tubeSegments; j++) {
      const a = i * ring + j,
        b = a + 1,
        c = (i + 1) * ring + j + 1,
        d = (i + 1) * ring + j;
      faces.push([a, b, c, d]);
    }
  }
  return { type: "polyhedron", vertices, faces };
};

/** Tetraedro regular inscrito em esfera de raio r. */
_API.tetrahedron = (r = 1, center = [0, 0, 0]) => {
  const [cx, cy, cz] = center;
  const a = (r * 2 * Math.sqrt(2)) / 3,
    h = r;
  const v = [
    [cx, cy + r, cz],
    [cx + a * Math.cos(0), cy - r / 3, cz + a * Math.sin(0)],
    [
      cx + a * Math.cos((2 * Math.PI) / 3),
      cy - r / 3,
      cz + a * Math.sin((2 * Math.PI) / 3),
    ],
    [
      cx + a * Math.cos((4 * Math.PI) / 3),
      cy - r / 3,
      cz + a * Math.sin((4 * Math.PI) / 3),
    ],
  ];
  return {
    type: "polyhedron",
    vertices: v,
    faces: [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 3, 2],
    ],
  };
};

// ════════════════════════════════════════════════════════════
// § 3  PROJEÇÕES E INTERSEÇÕES
// ════════════════════════════════════════════════════════════

_API.projectToPlane = (obj, plane) => {
  const [a, b, c, d] = plane.eq;
  const denom = a * a + b * b + c * c;
  if (denom < 1e-14) throw new Error("projectToPlane: plano com normal nula");
  const proj = ([x, y, z]) => {
    const t = -(a * x + b * y + c * z + d) / denom;
    return [x + t * a, y + t * b, z + t * c];
  };
  if (obj.type === "point3D") return { ...obj, coords: proj(obj.coords) };
  if (obj.type === "vector3D") {
    const pO = proj(obj.origin);
    const dest = proj(obj.origin.map((v, i) => v + obj.dir[i]));
    return { ...obj, origin: pO, dir: dest.map((v, i) => v - pO[i]) };
  }
  if (obj.type === "line3D") {
    const p0 = proj(obj.p0),
      p1 = proj(obj.p0.map((v, i) => v + obj.dir[i]));
    return { ...obj, p0, dir: p1.map((v, i) => v - p0[i]) };
  }
  if (obj.type === "polyhedron")
    return { ...obj, vertices: obj.vertices.map(proj) };
  return obj;
};

_API.intersectSurfacePlane = (func, planeEq, range = [-5, 5], step = 0.2) => {
  const [a, b, c, d] = planeEq,
    segs = [];
  const F = (x, z) => a * x + b * func(x, z) + c * z + d;
  for (let x = range[0]; x < range[1]; x += step) {
    for (let z = range[0]; z < range[1]; z += step) {
      const p1 = [x, z],
        p2 = [x + step, z],
        p3 = [x + step, z + step],
        p4 = [x, z + step];
      const v1 = F(...p1),
        v2 = F(...p2),
        v3 = F(...p3),
        v4 = F(...p4);
      const pts = [];
      const addI = (va, vb, pa, pb) => {
        if (va * vb <= 0 && va !== vb) {
          const t = va / (va - vb),
            ix = pa[0] + t * (pb[0] - pa[0]),
            iz = pa[1] + t * (pb[1] - pa[1]);
          pts.push([ix, func(ix, iz), iz]);
        }
      };
      addI(v1, v2, p1, p2);
      addI(v2, v3, p2, p3);
      addI(v3, v4, p3, p4);
      addI(v4, v1, p4, p1);
      if (pts.length >= 2) segs.push([pts[0], pts[1]]);
    }
  }
  return { type: "segments3D", segments: segs };
};

_API.intersectPolyhedronPlane = (poly, plane) => {
  const [a, b, c, d] = plane.eq;
  const dist = ([x, y, z]) => a * x + b * y + c * z + d;
  const segs = [];
  poly.faces.forEach((face) => {
    const pts = [];
    for (let i = 0; i < face.length; i++) {
      const p1 = poly.vertices[face[i]],
        p2 = poly.vertices[face[(i + 1) % face.length]];
      const d1 = dist(p1),
        d2 = dist(p2);
      if (Math.abs(d1) < 1e-7) pts.push(p1);
      else if (d1 * d2 < 0) {
        const t = d1 / (d1 - d2);
        pts.push(p1.map((v, j) => v + t * (p2[j] - v)));
      }
    }
    if (pts.length >= 2) segs.push([pts[0], pts[1]]);
  });
  return { type: "segments3D", segments: segs };
};

// ════════════════════════════════════════════════════════════
// § 4  ÁLGEBRA LINEAR
// ════════════════════════════════════════════════════════════

/** Cria uma matriz a partir de array 2D. */
_API.matrix = (data) => {
  if (!Array.isArray(data) || !data.length || !Array.isArray(data[0]))
    throw new Error("matrix(): esperado array 2D, ex: [[1,2],[3,4]]");
  const rows = data.length,
    cols = data[0].length;
  if (data.some((r) => r.length !== cols))
    throw new Error(
      "matrix(): todas as linhas devem ter o mesmo número de colunas",
    );
  return { type: "matrix", data: data.map((r) => r.map(Number)), rows, cols };
};

/** Matriz identidade n×n. */
_API.matrixIdentity = (n) => {
  const d = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  return _API.matrix(d);
};

/** Matriz de zeros m×n. */
_API.matrixZeros = (m, n = m) => {
  return _API.matrix(Array.from({ length: m }, () => Array(n).fill(0)));
};

/** Multiplicação por escalar. */
_API.matrixScale = (m, k) =>
  _API.matrix(m.data.map((r) => r.map((v) => v * k)));

_API.matrixAdd = (m1, m2) => {
  if (m1.rows !== m2.rows || m1.cols !== m2.cols)
    throw new Error("matrixAdd: dimensões incompatíveis");
  return _API.matrix(m1.data.map((r, i) => r.map((v, j) => v + m2.data[i][j])));
};

_API.matrixSub = (m1, m2) => {
  if (m1.rows !== m2.rows || m1.cols !== m2.cols)
    throw new Error("matrixSub: dimensões incompatíveis");
  return _API.matrix(m1.data.map((r, i) => r.map((v, j) => v - m2.data[i][j])));
};

_API.matrixMult = (m1, m2) => {
  if (m1.cols !== m2.rows)
    throw new Error(
      `matrixMult: ${m1.rows}×${m1.cols} × ${m2.rows}×${m2.cols} incompatível`,
    );
  const res = Array.from({ length: m1.rows }, () => Array(m2.cols).fill(0));
  for (let i = 0; i < m1.rows; i++)
    for (let j = 0; j < m2.cols; j++)
      for (let k = 0; k < m1.cols; k++)
        res[i][j] += m1.data[i][k] * m2.data[k][j];
  return _API.matrix(res);
};

_API.matrixTranspose = (m) => {
  const res = Array.from({ length: m.cols }, (_, j) =>
    Array.from({ length: m.rows }, (_, i) => m.data[i][j]),
  );
  return _API.matrix(res);
};

/**
 * Determinante via decomposição LU com pivoteamento parcial — O(n³).
 * Suporta matrizes até qualquer tamanho razoável (vs cofatores O(n!)).
 */
_API.matrixDet = (m) => {
  if (m.rows !== m.cols) throw new Error("matrixDet: matriz deve ser quadrada");
  const n = m.rows;
  if (n === 1) return m.data[0][0];
  if (n === 2) return m.data[0][0] * m.data[1][1] - m.data[0][1] * m.data[1][0];
  // LU decomposition with partial pivoting
  const A = m.data.map((r) => [...r]);
  let det = 1,
    swaps = 0;
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col,
      maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col]);
        maxRow = row;
      }
    }
    if (Math.abs(A[maxRow][col]) < 1e-14) return 0; // singular
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      swaps++;
    }
    det *= A[col][col];
    for (let row = col + 1; row < n; row++) {
      const f = A[row][col] / A[col][col];
      for (let k = col; k < n; k++) A[row][k] -= f * A[col][k];
    }
  }
  return det * (swaps % 2 === 0 ? 1 : -1);
};

/**
 * Decomposição LU com pivoteamento parcial.
 * @returns {{ L: matrix, U: matrix, P: matrix, sign: number }}
 */
_API.luDecomposition = (m) => {
  if (m.rows !== m.cols)
    throw new Error("luDecomposition: matriz deve ser quadrada");
  const n = m.rows;
  const A = m.data.map((r) => [...r]);
  const L = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  const P = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  let sign = 1;
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [P[col], P[maxRow]] = [P[maxRow], P[col]];
      for (let k = 0; k < col; k++)
        [L[col][k], L[maxRow][k]] = [L[maxRow][k], L[col][k]];
      sign = -sign;
    }
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[col][col]) < 1e-14) continue;
      L[row][col] = A[row][col] / A[col][col];
      for (let k = col; k < n; k++) A[row][k] -= L[row][col] * A[col][k];
    }
  }
  return { L: _API.matrix(L), U: _API.matrix(A), P: _API.matrix(P), sign };
};

_API.matrixInverse = (m) => {
  if (m.rows !== m.cols)
    throw new Error("matrixInverse: matriz deve ser quadrada");
  const det = _API.matrixDet(m);
  if (Math.abs(det) < 1e-12)
    throw new Error("matrixInverse: matriz singular (det ≈ 0)");
  const n = m.rows;
  if (n === 1) return _API.matrix([[1 / m.data[0][0]]]);
  if (n === 2) {
    return _API.matrix([
      [m.data[1][1] / det, -m.data[0][1] / det],
      [-m.data[1][0] / det, m.data[0][0] / det],
    ]);
  }
  // Gauss-Jordan for n ≥ 3
  const aug = m.data.map((r, i) => [
    ...r,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14)
      throw new Error("matrixInverse: matriz singular");
    for (let k = 0; k < 2 * n; k++) aug[col][k] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let k = 0; k < 2 * n; k++) aug[row][k] -= f * aug[col][k];
    }
  }
  return _API.matrix(aug.map((r) => r.slice(n)));
};

/** Norma de Frobenius (norma-F) da matriz. */
_API.matrixNorm = (m) =>
  Math.sqrt(m.data.flat().reduce((s, v) => s + v * v, 0));

/** Traço da matriz (soma da diagonal). */
_API.matrixTrace = (m) => {
  if (m.rows !== m.cols)
    throw new Error("matrixTrace: matriz deve ser quadrada");
  return m.data.reduce((s, r, i) => s + r[i], 0);
};

/**
 * Autovalores analíticos de matriz 2×2.
 * @returns {{ lambda1: number, lambda2: number }}
 */
_API.matrixEigenvalues2x2 = (m) => {
  if (m.rows !== 2 || m.cols !== 2)
    throw new Error("matrixEigenvalues2x2: apenas 2×2");
  const tr = _API.matrixTrace(m),
    det = _API.matrixDet(m);
  const disc = tr * tr - 4 * det;
  if (disc < 0) {
    const re = tr / 2,
      im = Math.sqrt(-disc) / 2;
    return { lambda1: { re, im }, lambda2: { re, im: -im }, complex: true };
  }
  return {
    lambda1: (tr + Math.sqrt(disc)) / 2,
    lambda2: (tr - Math.sqrt(disc)) / 2,
    complex: false,
  };
};

/**
 * Resolve sistema Ax = b por Eliminação de Gauss com pivoteamento parcial.
 * @param {object} A  Matriz de coeficientes
 * @param {number[]} b  Vetor independente
 * @returns {{ x: number[], residual: number }}
 */
_API.gaussianElimination = (A, b) => {
  const n = A.rows;
  if (n !== A.cols) throw new Error("gaussianElimination: A deve ser quadrada");
  if (b.length !== n)
    throw new Error("gaussianElimination: b deve ter tamanho n");
  const aug = A.data.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-14)
      throw new Error(`gaussianElimination: sistema singular na coluna ${col}`);
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let k = col; k <= n; k++) aug[row][k] -= f * aug[col][k];
    }
  }
  // Back-substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  // Residual ‖Ax - b‖
  const residual = Math.sqrt(
    b
      .map((bi, i) => {
        const Axi = A.data[i].reduce((s, v, j) => s + v * x[j], 0);
        return (Axi - bi) ** 2;
      })
      .reduce((a, b) => a + b, 0),
  );
  return { x, residual };
};

// ════════════════════════════════════════════════════════════
// § 5  CÁLCULO NUMÉRICO
// ════════════════════════════════════════════════════════════

// ─── 5a  Derivação & Integração ─────────────────────────────

/**
 * Derivada numérica via diferenças centrais.
 * @param {Function} f  f(x)
 * @param {number}   [h=1e-5]  Passo (padrão 1e-5 é melhor que 0.001)
 * @returns {Function} f'(x)
 */
_API.derivative =
  (f, h = 1e-5) =>
  (x) =>
    (f(x + h) - f(x - h)) / (2 * h);

/**
 * Segunda derivada numérica via diferenças centrais.
 * @returns {Function} f''(x)
 */
_API.derivative2 =
  (f, h = 1e-4) =>
  (x) =>
    (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

/**
 * Integral indefinida numérica F(x) = ∫₀ˣ f(t) dt (Regra dos Trapézios).
 * @param {Function} f  Integranda
 * @param {number}  [precision=0.01]
 * @returns {Function} F(x)
 */
_API.integral =
  (f, precision = 0.01) =>
  (x) => {
    if (x === 0) return 0;
    const sign = Math.sign(x);
    const N = Math.ceil(Math.abs(x) / precision);
    const h = x / N;
    let area = (f(0) + f(x)) / 2;
    for (let i = 1; i < N; i++) area += f(i * h);
    return area * h;
  };

/**
 * Integral definida ∫ₐᵇ f(x) dx por Regra dos Trapézios Composta.
 * @param {Function} f  Integranda
 * @param {number}   a  Limite inferior
 * @param {number}   b  Limite superior
 * @param {number}   [n=1000]  Número de subintervalos (mais = mais preciso)
 * @returns {number}
 */
_API.trapezoidalRule = (f, a, b, n = 1000) => {
  if (n <= 0) throw new Error("trapezoidalRule: n deve ser positivo");
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) sum += f(a + i * h);
  return sum * h;
};

/**
 * Integral definida pela Regra de Simpson 1/3 Composta.
 * Mais precisa que trapézios para funções suaves.
 * @param {Function} f
 * @param {number}   a
 * @param {number}   b
 * @param {number}   [n=1000]  Deve ser par
 * @returns {number}
 */
_API.simpsonRule = (f, a, b, n = 1000) => {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (h / 3) * sum;
};

/**
 * Regra de Simpson 3/8. Alternativa para n múltiplo de 3.
 * @returns {number}
 */
_API.simpson38Rule = (f, a, b, n = 999) => {
  if (n % 3 !== 0) n = Math.ceil(n / 3) * 3;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 3 === 0 ? 2 : 3);
  return ((3 * h) / 8) * sum;
};

/**
 * Gera lista de pontos {x, y} amostrados de f(x).
 * @param {Function} f            Função a amostrar
 * @param {[number,number]} [interval=[-10,10]]
 * @param {number} [step=1]
 * @returns {{ x:number, y:number }[]}
 */
_API.pointList = (f, interval = [-10, 10], step = 1) => {
  if (typeof f !== "function")
    throw new Error("pointList: primeiro argumento deve ser uma função");
  if (step <= 0) throw new Error("pointList: step deve ser positivo");
  const list = [];
  for (let x = interval[0]; x <= interval[1] + 1e-12; x += step) {
    try {
      const y = f(x);
      if (isFinite(y)) list.push({ x: +x.toFixed(10) * 1, y });
    } catch (_) {}
  }
  return list;
};

// ─── 5b  Interpolação ────────────────────────────────────────

/**
 * Interpolação de Gregory-Newton (diferenças finitas progressivas).
 * Requer pontos com espaçamento uniforme em x.
 * @param {{ x:number, y:number }[]} points  Mínimo 2 pontos, x uniform
 * @returns {Function} Polinômio interpolador p(x)
 */
_API.interpolationGN = (points) => {
  if (!points || points.length < 2)
    throw new Error("interpolationGN: mínimo 2 pontos");
  const n = points.length;
  const h = points[1].x - points[0].x;
  if (Math.abs(h) < 1e-14)
    throw new Error("interpolationGN: pontos com x idêntico");
  // Verificar espaçamento uniforme
  for (let i = 2; i < n; i++) {
    const hi = points[i].x - points[i - 1].x;
    if (Math.abs(hi - h) > 1e-8 * Math.abs(h))
      console.warn(
        `interpolationGN: espaçamento não-uniforme detectado (i=${i}). Use newtonDividedDiff.`,
      );
  }
  const y = points.map((p) => p.y);
  const diffs = [y.slice()];
  for (let j = 1; j < n; j++) {
    const col = [];
    for (let i = 0; i < n - j; i++)
      col.push(diffs[j - 1][i + 1] - diffs[j - 1][i]);
    diffs.push(col);
  }
  const fact = (() => {
    const c = [1];
    for (let i = 1; i <= n; i++) c.push(c[i - 1] * i);
    return (i) => c[i];
  })();
  return (x) => {
    const u = (x - points[0].x) / h;
    let result = points[0].y,
      uProd = 1;
    for (let i = 1; i < n; i++) {
      uProd *= u - (i - 1);
      result += (uProd * diffs[i][0]) / fact(i);
    }
    return result;
  };
};

/**
 * Interpolação de Lagrange.
 * Funciona com pontos não-uniformemente espaçados.
 * @param {{ x:number, y:number }[]} points
 * @returns {Function} p(x)
 */
_API.lagrangeInterpolation = (points) => {
  if (!points || points.length < 2)
    throw new Error("lagrangeInterpolation: mínimo 2 pontos");
  const n = points.length;
  return (x) => {
    let result = 0;
    for (let i = 0; i < n; i++) {
      let li = 1;
      for (let j = 0; j < n; j++) {
        if (j !== i) li *= (x - points[j].x) / (points[i].x - points[j].x);
      }
      result += points[i].y * li;
    }
    return result;
  };
};

/**
 * Interpolação de Newton por Diferenças Divididas.
 * Funciona com espaçamento não-uniforme.
 * @param {{ x:number, y:number }[]} points
 * @returns {{ poly: Function, coefficients: number[], table: number[][] }}
 */
_API.newtonDividedDiff = (points) => {
  if (!points || points.length < 2)
    throw new Error("newtonDividedDiff: mínimo 2 pontos");
  const n = points.length;
  const xs = points.map((p) => p.x);
  // Tabela de diferenças divididas
  const f = Array.from({ length: n }, (_, i) => Array(n).fill(0));
  for (let i = 0; i < n; i++) f[i][0] = points[i].y;
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      const denom = xs[i + j] - xs[i];
      if (Math.abs(denom) < 1e-14)
        throw new Error(
          `newtonDividedDiff: pontos x[${i}] e x[${i + j}] idênticos`,
        );
      f[i][j] = (f[i + 1][j - 1] - f[i][j - 1]) / denom;
    }
  }
  const coefs = Array.from({ length: n }, (_, j) => f[0][j]);
  const poly = (x) => {
    let result = coefs[0],
      prod = 1;
    for (let i = 1; i < n; i++) {
      prod *= x - xs[i - 1];
      result += coefs[i] * prod;
    }
    return result;
  };
  return { poly, coefficients: coefs, table: f };
};

/**
 * Spline linear por partes (interpolação linear entre pares de pontos).
 * @returns {Function}
 */
_API.splineLinear = (points) => {
  if (!points || points.length < 2)
    throw new Error("splineLinear: mínimo 2 pontos");
  const sorted = [...points].sort((a, b) => a.x - b.x);
  return (x) => {
    if (x <= sorted[0].x) return sorted[0].y;
    if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (x <= sorted[i + 1].x) {
        const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
        return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
      }
    }
    return NaN;
  };
};

/**
 * Coeficientes de Mínimos Quadrados (ajuste polinomial).
 * @param {{ x:number, y:number }[]} points
 * @param {number} [degree=1]  Grau do polinômio
 * @returns {{ poly: Function, coefficients: number[], rSquared: number }}
 */
_API.leastSquares = (points, degree = 1) => {
  const n = points.length,
    d = degree + 1;
  if (n < d)
    throw new Error(
      "leastSquares: pontos insuficientes para o grau especificado",
    );
  // Montar sistema normal A^T A c = A^T y
  const A = points.map((p) =>
    Array.from({ length: d }, (_, k) => Math.pow(p.x, k)),
  );
  const AM = _API.matrix(A);
  const AT = _API.matrixTranspose(AM);
  const ATA = _API.matrixMult(AT, AM);
  const ys = points.map((p) => p.y);
  const ATy = AT.data.map((r) => r.reduce((s, v, i) => s + v * ys[i], 0));
  const { x: coefs } = _API.gaussianElimination(ATA, ATy);
  const poly = (x) => coefs.reduce((s, c, k) => s + c * Math.pow(x, k), 0);
  // R²
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const SStot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const SSres = points.reduce((s, p) => s + (p.y - poly(p.x)) ** 2, 0);
  const rSquared = SStot < 1e-14 ? 1 : 1 - SSres / SStot;
  return { poly, coefficients: coefs, rSquared };
};

// ─── 5c  Zeros de Funções (Root Finding) ────────────────────

/**
 * Método da Bissecção.
 * @param {Function} f        f(x) contínua em [a, b]
 * @param {number}   a        Extremo esquerdo (f(a) e f(b) devem ter sinais opostos)
 * @param {number}   b        Extremo direito
 * @param {number}   [tol=1e-8]
 * @param {number}   [maxIter=100]
 * @returns {{ root:number, iterations:number, converged:boolean, history:number[] }}
 */
_API.bisection = (f, a, b, tol = 1e-8, maxIter = 100) => {
  if (f(a) * f(b) > 0)
    throw new Error("bisection: f(a) e f(b) devem ter sinais opostos");
  const history = [];
  let lo = a,
    hi = b,
    iter = 0,
    mid;
  while (iter < maxIter) {
    mid = (lo + hi) / 2;
    history.push(mid);
    if (Math.abs(f(mid)) < tol || (hi - lo) / 2 < tol) break;
    if (f(lo) * f(mid) < 0) hi = mid;
    else lo = mid;
    iter++;
  }
  return {
    root: mid,
    iterations: iter,
    converged: Math.abs(f(mid)) < tol || (hi - lo) / 2 < tol,
    history,
  };
};

/**
 * Método de Newton-Raphson.
 * @param {Function} f        f(x)
 * @param {number}   x0       Estimativa inicial
 * @param {Function} [df]     Derivada f'(x) — se omitida, usa derivada numérica
 * @param {number}   [tol=1e-10]
 * @param {number}   [maxIter=100]
 * @returns {{ root:number, iterations:number, converged:boolean, history:number[], errors:number[] }}
 */
_API.newtonRaphson = (f, x0, df = null, tol = 1e-10, maxIter = 100) => {
  const fprime = df || _API.derivative(f);
  const history = [x0],
    errors = [];
  let x = x0,
    iter = 0;
  while (iter < maxIter) {
    const fx = f(x),
      fpx = fprime(x);
    if (Math.abs(fpx) < 1e-14)
      throw new Error("newtonRaphson: derivada nula em x=" + x);
    const xNew = x - fx / fpx;
    const err = Math.abs(xNew - x);
    errors.push(err);
    history.push(xNew);
    x = xNew;
    iter++;
    if (err < tol && Math.abs(f(x)) < tol) break;
  }
  return {
    root: x,
    iterations: iter,
    converged: Math.abs(f(x)) < tol,
    history,
    errors,
  };
};

/**
 * Método da Secante.
 * @param {Function} f
 * @param {number}   x0  Primeira estimativa
 * @param {number}   x1  Segunda estimativa
 * @param {number}   [tol=1e-10]
 * @param {number}   [maxIter=100]
 * @returns {{ root:number, iterations:number, converged:boolean, history:number[], errors:number[] }}
 */
_API.secant = (f, x0, x1, tol = 1e-10, maxIter = 100) => {
  const history = [x0, x1],
    errors = [];
  let xPrev = x0,
    xCurr = x1,
    iter = 0;
  while (iter < maxIter) {
    const fPrev = f(xPrev),
      fCurr = f(xCurr);
    if (Math.abs(fCurr - fPrev) < 1e-14)
      throw new Error("secant: denominador nulo");
    const xNew = xCurr - (fCurr * (xCurr - xPrev)) / (fCurr - fPrev);
    const err = Math.abs(xNew - xCurr);
    errors.push(err);
    history.push(xNew);
    xPrev = xCurr;
    xCurr = xNew;
    iter++;
    if (err < tol && Math.abs(f(xCurr)) < tol) break;
  }
  return {
    root: xCurr,
    iterations: iter,
    converged: Math.abs(f(xCurr)) < tol,
    history,
    errors,
  };
};

/**
 * Iteração de Ponto Fixo: x_{n+1} = g(x_n).
 * @param {Function} g   Função de iteração g(x)
 * @param {number}   x0  Estimativa inicial
 * @param {number}   [tol=1e-10]
 * @param {number}   [maxIter=200]
 * @returns {{ root:number, iterations:number, converged:boolean, history:number[], errors:number[] }}
 */
_API.fixedPoint = (g, x0, tol = 1e-10, maxIter = 200) => {
  const history = [x0],
    errors = [];
  let x = x0,
    iter = 0;
  while (iter < maxIter) {
    const xNew = g(x);
    if (!isFinite(xNew)) throw new Error("fixedPoint: divergiu em x=" + x);
    const err = Math.abs(xNew - x);
    errors.push(err);
    history.push(xNew);
    x = xNew;
    iter++;
    if (err < tol) break;
  }
  return {
    root: x,
    iterations: iter,
    converged: errors[errors.length - 1] < tol,
    history,
    errors,
  };
};

/**
 * Método da Falsa Posição (Regula Falsi).
 * Combina garantia da Bissecção com velocidade da Secante.
 */
_API.regulaFalsi = (f, a, b, tol = 1e-8, maxIter = 100) => {
  if (f(a) * f(b) > 0)
    throw new Error("regulaFalsi: f(a) e f(b) devem ter sinais opostos");
  const history = [],
    errors = [];
  let lo = a,
    hi = b,
    iter = 0,
    c;
  while (iter < maxIter) {
    const fa = f(lo),
      fb = f(hi);
    c = lo - (fa * (hi - lo)) / (fb - fa);
    const fc = f(c);
    history.push(c);
    errors.push(Math.abs(fc));
    if (Math.abs(fc) < tol) break;
    if (fa * fc < 0) hi = c;
    else lo = c;
    iter++;
  }
  return {
    root: c,
    iterations: iter,
    converged: Math.abs(f(c)) < tol,
    history,
    errors,
  };
};

// ─── 5d  EDOs ────────────────────────────────────────────────

/**
 * Método de Euler (passo simples) para EDO y' = f(t, y).
 * @param {Function} f  f(t, y) — lado direito da EDO
 * @param {number}   y0 Condição inicial
 * @param {number}   t0 Tempo inicial
 * @param {number}   tf Tempo final
 * @param {number}   h  Passo
 * @returns {{ t:number[], y:number[], points:{x:number,y:number}[] }}
 */
_API.eulerMethod = (f, y0, t0, tf, h) => {
  if (h <= 0) throw new Error("eulerMethod: h deve ser positivo");
  const t = [t0],
    y = [y0];
  let ti = t0,
    yi = y0;
  while (ti + h <= tf + 1e-12) {
    yi = yi + h * f(ti, yi);
    ti = ti + h;
    t.push(ti);
    y.push(yi);
    if (!isFinite(yi)) {
      console.warn("eulerMethod: divergiu em t=" + ti);
      break;
    }
  }
  return { t, y, points: t.map((x, i) => ({ x, y: y[i] })) };
};

/**
 * Método de Euler Melhorado (Heun / preditor-corretor).
 */
_API.eulerImproved = (f, y0, t0, tf, h) => {
  if (h <= 0) throw new Error("eulerImproved: h deve ser positivo");
  const t = [t0],
    y = [y0];
  let ti = t0,
    yi = y0;
  while (ti + h <= tf + 1e-12) {
    const k1 = f(ti, yi);
    const yPred = yi + h * k1;
    const k2 = f(ti + h, yPred);
    yi = yi + (h / 2) * (k1 + k2);
    ti = ti + h;
    t.push(ti);
    y.push(yi);
    if (!isFinite(yi)) {
      console.warn("eulerImproved: divergiu em t=" + ti);
      break;
    }
  }
  return { t, y, points: t.map((x, i) => ({ x, y: y[i] })) };
};

/**
 * Runge-Kutta de 4ª Ordem (RK4) para EDO y' = f(t, y).
 * Método padrão para EDOs com boa relação precisão/custo.
 * @param {Function} f   f(t, y) — lado direito
 * @param {number}   y0  Condição inicial
 * @param {number}   t0  Tempo inicial
 * @param {number}   tf  Tempo final
 * @param {number}   h   Passo
 * @returns {{ t:number[], y:number[], points:{x:number,y:number}[] }}
 */
_API.rungeKutta4 = (f, y0, t0, tf, h) => {
  if (h <= 0) throw new Error("rungeKutta4: h deve ser positivo");
  const t = [t0],
    y = [y0];
  let ti = t0,
    yi = y0;
  while (ti + h <= tf + 1e-12) {
    const k1 = h * f(ti, yi);
    const k2 = h * f(ti + h / 2, yi + k1 / 2);
    const k3 = h * f(ti + h / 2, yi + k2 / 2);
    const k4 = h * f(ti + h, yi + k3);
    yi = yi + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    ti = ti + h;
    t.push(ti);
    y.push(yi);
    if (!isFinite(yi)) {
      console.warn("rungeKutta4: divergiu em t=" + ti);
      break;
    }
  }
  return { t, y, points: t.map((x, i) => ({ x, y: y[i] })) };
};

/**
 * RK4 para sistema de EDOs y' = F(t, Y), Y ∈ ℝⁿ.
 * @param {Function} F  F(t, Y) → array de tamanho n
 * @param {number[]} Y0 Vetor de condições iniciais
 * @returns {{ t:number[], Y:number[][], points:{x:number,y:number}[] }} (points usa Y[0])
 */
_API.rungeKutta4System = (F, Y0, t0, tf, h) => {
  if (h <= 0) throw new Error("rungeKutta4System: h deve ser positivo");
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const scale = (a, s) => a.map((v) => v * s);
  const t = [t0],
    Y = [Y0.slice()];
  let ti = t0,
    Yi = Y0.slice();
  while (ti + h <= tf + 1e-12) {
    const k1 = scale(F(ti, Yi), h);
    const k2 = scale(F(ti + h / 2, add(Yi, scale(k1, 0.5))), h);
    const k3 = scale(F(ti + h / 2, add(Yi, scale(k2, 0.5))), h);
    const k4 = scale(F(ti + h, add(Yi, k3)), h);
    Yi = Yi.map((v, i) => v + (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
    ti += h;
    t.push(ti);
    Y.push(Yi.slice());
    if (Yi.some((v) => !isFinite(v))) {
      console.warn("rungeKutta4System: divergiu em t=" + ti);
      break;
    }
  }
  return { t, Y, points: t.map((x, i) => ({ x, y: Y[i][0] })) };
};

// ─── 5e  Sistemas Lineares Iterativos ───────────────────────

/**
 * Método de Jacobi.
 * @param {object}   A        Matriz dos coeficientes (diagonal estritamente dominante)
 * @param {number[]} b        Vetor independente
 * @param {number[]} [x0]     Estimativa inicial (zeros se omitido)
 * @param {number}   [tol=1e-8]
 * @param {number}   [maxIter=200]
 * @returns {{ x:number[], iterations:number, converged:boolean, errors:number[], history:number[][] }}
 */
_API.jacobi = (A, b, x0 = null, tol = 1e-8, maxIter = 200) => {
  const n = A.rows;
  let x = x0 ? [...x0] : Array(n).fill(0);
  const history = [x.slice()],
    errors = [];
  for (let iter = 0; iter < maxIter; iter++) {
    const xNew = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (j !== i) sum -= A.data[i][j] * x[j];
      if (Math.abs(A.data[i][i]) < 1e-14)
        throw new Error(`jacobi: elemento diagonal nulo (i=${i})`);
      xNew[i] = sum / A.data[i][i];
    }
    const err = Math.sqrt(xNew.reduce((s, v, i) => s + (v - x[i]) ** 2, 0));
    errors.push(err);
    history.push(xNew.slice());
    x = xNew;
    if (err < tol)
      return { x, iterations: iter + 1, converged: true, errors, history };
  }
  return { x, iterations: maxIter, converged: false, errors, history };
};

/**
 * Método de Gauss-Seidel.
 * Converge mais rápido que Jacobi para sistemas diagonal-dominantes.
 */
_API.gaussSeidel = (A, b, x0 = null, tol = 1e-8, maxIter = 200) => {
  const n = A.rows;
  let x = x0 ? [...x0] : Array(n).fill(0);
  const history = [x.slice()],
    errors = [];
  for (let iter = 0; iter < maxIter; iter++) {
    const xOld = x.slice();
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) if (j !== i) sum -= A.data[i][j] * x[j];
      if (Math.abs(A.data[i][i]) < 1e-14)
        throw new Error(`gaussSeidel: elemento diagonal nulo (i=${i})`);
      x[i] = sum / A.data[i][i];
    }
    const err = Math.sqrt(x.reduce((s, v, i) => s + (v - xOld[i]) ** 2, 0));
    errors.push(err);
    history.push(x.slice());
    if (err < tol)
      return { x, iterations: iter + 1, converged: true, errors, history };
  }
  return { x, iterations: maxIter, converged: false, errors, history };
};

// ─── 5f  Campos Vetoriais ─────────────────────────────────────

_API.vectorField2D = (
  fX,
  fY,
  rangeX = [-10, 10],
  rangeY = [-10, 10],
  step = 1,
) => {
  const vectors = [];
  for (let x = rangeX[0]; x <= rangeX[1]; x += step) {
    for (let y = rangeY[0]; y <= rangeY[1]; y += step) {
      try {
        const dx = fX(x, y),
          dy = fY(x, y);
        if (isFinite(dx) && isFinite(dy)) {
          const v = _API.vector(2, [dx, dy]);
          v.origin = { x, y };
          vectors.push(v);
        }
      } catch (_) {}
    }
  }
  return vectors;
};

_API.vectorField3D = (fX, fY, fZ, range = [-5, 5], step = 2) => {
  const vectors = [];
  for (let x = range[0]; x <= range[1]; x += step) {
    for (let y = range[0]; y <= range[1]; y += step) {
      for (let z = range[0]; z <= range[1]; z += step) {
        try {
          const dx = fX(x, y, z),
            dy = fY(x, y, z),
            dz = fZ(x, y, z);
          if (isFinite(dx) && isFinite(dy) && isFinite(dz))
            vectors.push(_API.vector3D(dx, dy, dz, x, y, z));
        } catch (_) {}
      }
    }
  }
  return vectors;
};

/** Cônica Ax²+Bxy+Cy²+Dx+Ey+F=0 — retorna par de funções [y+(x), y-(x)]. */
_API.conic2D = (A, B, C, D, E, F) => [
  (x) => {
    const a = C,
      b = B * x + E,
      c = A * x * x + D * x + F;
    if (Math.abs(a) < 1e-7) return Math.abs(b) < 1e-7 ? NaN : -c / b;
    const d = b * b - 4 * a * c;
    return d >= 0 ? (-b + Math.sqrt(d)) / (2 * a) : NaN;
  },
  (x) => {
    const a = C,
      b = B * x + E,
      c = A * x * x + D * x + F;
    if (Math.abs(a) < 1e-7) return NaN;
    const d = b * b - 4 * a * c;
    return d >= 0 ? (-b - Math.sqrt(d)) / (2 * a) : NaN;
  },
];

// ════════════════════════════════════════════════════════════
// § 6  UTILITÁRIOS E CONVENIÊNCIA
// ════════════════════════════════════════════════════════════

/**
 * Gera array [start, start+step, ..., end] (inclusivo).
 * Similar ao range do Python mas com passo real.
 * @param {number} start
 * @param {number} end
 * @param {number} [step=1]
 */
_API.range = (start, end, step = 1) => {
  if (step <= 0) throw new Error("range: step deve ser positivo");
  const arr = [];
  for (let v = start; v <= end + 1e-12; v += step)
    arr.push(+v.toPrecision(12) * 1);
  return arr;
};

/**
 * N valores igualmente espaçados entre start e end (inclusivo).
 * Equivalente ao numpy.linspace.
 */
_API.linspace = (start, end, n = 100) => {
  if (n < 2) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
};

/** Array de N zeros. */
_API.zeros = (n) => Array(n).fill(0);

/** Array de N uns. */
_API.ones = (n) => Array(n).fill(1);

/** Soma de um array de números. */
_API.sum = (arr) => arr.reduce((a, b) => a + b, 0);

/** Média aritmética. */
_API.mean = (arr) => _API.sum(arr) / arr.length;

/** Variância populacional. */
_API.variance = (arr) => {
  const m = _API.mean(arr);
  return _API.mean(arr.map((x) => (x - m) ** 2));
};

/** Desvio padrão populacional. */
_API.stddev = (arr) => Math.sqrt(_API.variance(arr));

/** Máximo de um array. */
_API.max = (arr) => Math.max(...arr);

/** Mínimo de um array. */
_API.min = (arr) => Math.min(...arr);

/** Normaliza array para [0, 1]. */
_API.normalize = (arr) => {
  const mn = _API.min(arr),
    mx = _API.max(arr),
    rng = mx - mn;
  return rng < 1e-14 ? arr.map(() => 0.5) : arr.map((v) => (v - mn) / rng);
};

/**
 * Paleta de cores padrão para múltiplos datasets.
 * Retorna array de hex strings.
 */
_API.colorPalette = (n = 8) => {
  const base = [
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#a78bfa",
    "#f87171",
    "#34d399",
    "#fb923c",
    "#818cf8",
    "#e879f9",
    "#facc15",
    "#4ade80",
    "#38bdf8",
    "#f472b6",
    "#a3e635",
    "#fb7185",
    "#fbbf24",
  ];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
};

/**
 * Converte array de objetos para matrix PlotterAPI.
 * @param {object[]} rows  Ex: [{x:1, y:2}, {x:3, y:4}]
 * @param {string[]} keys  Colunas a extrair (ex: ['x','y'])
 */
_API.tableToMatrix = (rows, keys) => {
  if (!keys) keys = Object.keys(rows[0]);
  return _API.matrix(rows.map((r) => keys.map((k) => Number(r[k]) || 0)));
};

/**
 * Converte resultado de método numérico iterativo em array de pontos {x, y}.
 * Útil para plotar a convergência.
 * @param {number[]} history  Array de valores por iteração
 */
_API.historyToPoints = (history) =>
  history.map((v, i) => ({ x: i, y: typeof v === "number" ? v : 0 }));

/**
 * Gera pontos {x, y} de um array de erros por iteração.
 * Plota na escala log10 se positivos.
 */
_API.errorToPoints = (errors, logScale = true) =>
  errors
    .filter((e) => e > 0)
    .map((e, i) => ({ x: i + 1, y: logScale ? Math.log10(e) : e }));

// ════════════════════════════════════════════════════════════
// § 7  RENDERIZAÇÃO 2D
// ════════════════════════════════════════════════════════════

// ─── Helpers internos ────────────────────────────────────────

const _THEME = {
  light: {
    bg: "#ffffff",
    grid: "#f1f5f9",
    axis: "#64748b",
    text: "#475569",
    tickText: "#64748b",
  },
  dark: {
    bg: "#0d1117",
    grid: "#1e2d3d",
    axis: "#475569",
    text: "#94a3b8",
    tickText: "#64748b",
  },
};

function _makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function _drawGrid2D(
  ctx,
  toPxX,
  toPxY,
  xMin,
  xMax,
  adjYMin,
  adjYMax,
  pad,
  w,
  h,
  theme = "light",
) {
  const T = _THEME[theme] || _THEME.light;
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, w, h);
  // Grid
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const vx = xMin + i * ((xMax - xMin) / 10);
    ctx.beginPath();
    ctx.moveTo(toPxX(vx), pad);
    ctx.lineTo(toPxX(vx), h - pad);
    ctx.stroke();
    const vy = adjYMin + i * ((adjYMax - adjYMin) / 10);
    ctx.beginPath();
    ctx.moveTo(pad, toPxY(vy));
    ctx.lineTo(w - pad, toPxY(vy));
    ctx.stroke();
  }
  // Axes
  ctx.strokeStyle = T.axis;
  ctx.lineWidth = 1.5;
  const zY = Math.max(pad, Math.min(h - pad, toPxY(0)));
  const zX = Math.max(pad, Math.min(w - pad, toPxX(0)));
  ctx.beginPath();
  ctx.moveTo(pad, zY);
  ctx.lineTo(w - pad, zY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(zX, pad);
  ctx.lineTo(zX, h - pad);
  ctx.stroke();
  return { zX, zY };
}

function _drawTicks(
  ctx,
  toPxX,
  toPxY,
  xMin,
  xMax,
  yMin,
  yMax,
  zX,
  zY,
  theme = "light",
) {
  const T = _THEME[theme] || _THEME.light;
  ctx.fillStyle = T.tickText;
  ctx.font = "10px sans-serif";
  ctx.strokeStyle = T.axis;
  ctx.lineWidth = 1;
  const xStep = (xMax - xMin) / 10;
  for (let i = 0; i <= 10; i++) {
    const val = xMin + i * xStep,
      px = toPxX(val);
    ctx.beginPath();
    ctx.moveTo(px, zY - 4);
    ctx.lineTo(px, zY + 4);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillText(val.toFixed(1), px, zY + 15);
  }
  const yStep = (yMax - yMin) / 10;
  for (let i = 0; i <= 10; i++) {
    const val = yMin + i * yStep,
      py = toPxY(val);
    ctx.beginPath();
    ctx.moveTo(zX - 4, py);
    ctx.lineTo(zX + 4, py);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(val.toFixed(1), zX - 8, py + 3);
  }
}

function _drawLegend(ctx, datasets, x, y) {
  const lineH = 18,
    boxW = 14,
    boxH = 3,
    pad = 8;
  const labels = datasets.filter((d) => d.label);
  if (!labels.length) return;
  const maxW =
    Math.max(...labels.map((d) => ctx.measureText(d.label).width)) +
    boxW +
    pad * 3;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, maxW, labels.length * lineH + pad, 4);
  ctx.fill();
  ctx.stroke();
  labels.forEach((d, i) => {
    const ly = y + pad + i * lineH + lineH / 2 - boxH / 2;
    ctx.fillStyle = d.color || "#3b82f6";
    ctx.fillRect(x + pad, ly, boxW, boxH * 3);
    ctx.fillStyle = "#1e293b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(d.label, x + pad + boxW + 6, ly + boxH * 2);
  });
}

/**
 * Gráfico de múltiplas curvas 2D.
 * @param {object[]} datasets  [{func, points, color, label, step, dashed}, ...]
 * @param {[number,number]} [interval=[-10,10]]
 * @param {object} [options]
 * @param {number}  [options.width=600]
 * @param {number}  [options.height=400]
 * @param {boolean} [options.mesh=true]
 * @param {boolean} [options.showAxisMarks=true]
 * @param {number}  [options.padding=48]
 * @param {boolean} [options.pointHover=false]
 * @param {string}  [options.theme='light']  'light' | 'dark'
 * @param {string}  [options.title]
 * @param {boolean} [options.legend=true]
 */
_API.multiLineGraph2D = (datasets, interval = [-10, 10], options = {}) => {
  const {
    width = 600,
    height = 400,
    mesh = true,
    showAxisMarks = true,
    padding = 48,
    pointHover = false,
    theme = "light",
    title = "",
    legend = true,
  } = options;

  const canvas = _makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const [xMin, xMax] = interval;
  const T = _THEME[theme] || _THEME.light;

  let yMin = Infinity,
    yMax = -Infinity;
  const processedData = datasets.map((dataset) => {
    const step = dataset.step || options.step || 0.1,
      samples = [];
    if (dataset.func) {
      for (let x = xMin; x <= xMax + 1e-12; x += step) {
        try {
          const y = dataset.func(x);
          if (isFinite(y)) {
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
            samples.push({ x, y });
          }
        } catch (_) {}
      }
    }
    if (dataset.points) {
      dataset.points.forEach((p) => {
        if (isFinite(p.y)) {
          yMin = Math.min(yMin, p.y);
          yMax = Math.max(yMax, p.y);
        }
      });
    }
    return { ...dataset, samples };
  });

  // Guard against no data
  if (!isFinite(yMin)) yMin = -1;
  if (!isFinite(yMax)) yMax = 1;
  if (yMax - yMin < 1e-10) {
    yMin -= 1;
    yMax += 1;
  }

  const yRange = yMax - yMin;
  const adjYMin = yMin - yRange * 0.08;
  const adjYMax = yMax + yRange * 0.08;
  const topPad = title ? padding + 18 : padding;

  const toPxX = (x) =>
    padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toPxY = (y) =>
    height -
    padding -
    ((y - adjYMin) / (adjYMax - adjYMin)) * (height - topPad - padding);

  const render = (hoverPoint = null) => {
    ctx.clearRect(0, 0, width, height);
    const { zX, zY } = _drawGrid2D(
      ctx,
      toPxX,
      toPxY,
      xMin,
      xMax,
      adjYMin,
      adjYMax,
      padding,
      width,
      height,
      theme,
    );
    if (showAxisMarks)
      _drawTicks(
        ctx,
        toPxX,
        toPxY,
        xMin,
        xMax,
        adjYMin,
        adjYMax,
        zX,
        zY,
        theme,
      );

    if (title) {
      ctx.fillStyle = T.text;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, width / 2, 18);
    }

    processedData.forEach((data) => {
      const color = data.color || "#3b82f6";
      if (data.samples.length > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        if (data.dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        data.samples.forEach((p, i) => {
          try {
            i === 0
              ? ctx.moveTo(toPxX(p.x), toPxY(p.y))
              : ctx.lineTo(toPxX(p.x), toPxY(p.y));
          } catch (_) {}
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (data.points) {
        const r = data.pointRadius || 4;
        data.points.forEach((p) => {
          if (!isFinite(p.y)) return;
          ctx.fillStyle = data.pointColor || color;
          ctx.beginPath();
          ctx.arc(toPxX(p.x), toPxY(p.y), r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = theme === "dark" ? "#1e293b" : "#fff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    });

    if (legend)
      _drawLegend(
        ctx,
        processedData.filter((d) => d.label),
        padding + 8,
        topPad + 8,
      );

    if (hoverPoint) {
      const px = toPxX(hoverPoint.x),
        py = toPxY(hoverPoint.y);
      // Crosshair
      ctx.strokeStyle = "rgba(100,116,139,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, topPad);
      ctx.lineTo(px, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, py);
      ctx.lineTo(width - padding, py);
      ctx.stroke();
      ctx.setLineDash([]);
      // Dot
      ctx.fillStyle = hoverPoint._color || "#3b82f6";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Tooltip
      const label = `(${hoverPoint.x.toFixed(3)}, ${hoverPoint.y.toFixed(3)})`;
      ctx.font = "bold 11px sans-serif";
      const tw = ctx.measureText(label).width;
      const tx = Math.min(px + 10, width - tw - 20),
        ty = Math.max(py - 30, topPad + 5);
      ctx.fillStyle = "rgba(15,23,42,0.92)";
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw + 14, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.fillText(label, tx + 7, ty + 15);
    }
  };

  render();

  if (pointHover) {
    let lastHover = null;
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (width / rect.width);
      const my = (e.clientY - rect.top) * (height / rect.height);
      let found = null;
      const threshold = 10;
      for (const data of processedData) {
        const pts = data.points || data.samples;
        const color = data.color || "#3b82f6";
        for (const p of pts) {
          if (!isFinite(p.y)) continue;
          if (Math.hypot(mx - toPxX(p.x), my - toPxY(p.y)) < threshold) {
            found = { ...p, _color: color };
            break;
          }
        }
        if (found) break;
      }
      if (found !== lastHover) {
        lastHover = found;
        render(found);
      }
      canvas.style.cursor = found ? "crosshair" : "default";
    });
    canvas.addEventListener("mouseleave", () => {
      if (lastHover) {
        lastHover = null;
        render(null);
      }
    });
  }

  return canvas;
};

/**
 * Gráfico de linha 2D simples.
 * @param {Function} func
 * @param {[number,number]} [interval=[-10,10]]
 * @param {object} [options]
 */
_API.lineGraph2D = (func, interval = [-10, 10], options = {}) => {
  if (typeof func !== "function")
    throw new Error("lineGraph2D: primeiro argumento deve ser uma função");
  return _API.multiLineGraph2D(
    [
      {
        func,
        color: options.color,
        label: options.label,
        step: options.step,
        dashed: options.dashed,
      },
    ],
    interval,
    options,
  );
};

/**
 * Scatter plot (nuvem de pontos).
 * @param {{ x:number, y:number }[]} points
 * @param {object} [options]
 */
_API.scatterPlot = (points, options = {}) => {
  if (!Array.isArray(points) || !points.length)
    throw new Error("scatterPlot: pontos inválidos");
  const { color = "#06b6d4", pointRadius = 4, label = "", ...rest } = options;
  return _API.multiLineGraph2D(
    [{ points, color, pointColor: color, pointRadius, label }],
    [Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x))],
    { pointHover: true, ...rest },
  );
};

/**
 * Gráfico de barras vertical.
 * @param {string[]} labels  Rótulos das categorias
 * @param {number[]} values  Valores
 * @param {object}   [options]
 */
_API.barChart = (labels, values, options = {}) => {
  if (!labels.length || labels.length !== values.length)
    throw new Error("barChart: labels e values devem ter o mesmo tamanho");
  const {
    width = 600,
    height = 400,
    colors = null,
    title = "",
    padding = 48,
    theme = "light",
    showValues = true,
  } = options;
  const canvas = _makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const T = _THEME[theme] || _THEME.light;
  const palette = colors || _API.colorPalette(values.length);

  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, width, height);

  const vMin = Math.min(0, Math.min(...values)),
    vMax = Math.max(...values);
  const vRange = vMax - vMin || 1;
  const adjMin = vMin - vRange * 0.05,
    adjMax = vMax + vRange * 0.15;
  const topPad = title ? 36 : padding,
    botPad = padding + 18;
  const toPxY = (v) =>
    height -
    botPad -
    ((v - adjMin) / (adjMax - adjMin)) * (height - topPad - botPad);
  const zeroY = toPxY(0);
  const innerW = width - 2 * padding;
  const barW = (innerW / values.length) * 0.65;
  const gap = innerW / values.length;

  // Grid
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const v = adjMin + (i * (adjMax - adjMin)) / 5,
      py = toPxY(v);
    ctx.beginPath();
    ctx.moveTo(padding, py);
    ctx.lineTo(width - padding, py);
    ctx.stroke();
    ctx.fillStyle = T.tickText;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(v.toFixed(1), padding - 6, py + 3);
  }

  // Zero axis
  ctx.strokeStyle = T.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(width - padding, zeroY);
  ctx.stroke();

  if (title) {
    ctx.fillStyle = T.text;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 22);
  }

  values.forEach((v, i) => {
    const x = padding + i * gap + gap / 2 - barW / 2;
    const barH = Math.abs(toPxY(v) - zeroY);
    const barY = v >= 0 ? toPxY(v) : zeroY;
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.roundRect(x, barY, barW, barH, 2);
    ctx.fill();
    // Label
    ctx.fillStyle = T.tickText;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + barW / 2, height - botPad + 13);
    // Value
    if (showValues) {
      ctx.fillStyle = T.text;
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(v.toFixed(2), x + barW / 2, barY - 4);
    }
  });

  return canvas;
};

/**
 * Histograma de uma distribuição de dados.
 * @param {number[]} data    Dados brutos
 * @param {number}   [bins=10]
 * @param {object}   [options]
 */
_API.histogram = (data, bins = 10, options = {}) => {
  if (!data.length) throw new Error("histogram: dados vazios");
  const { color = "#06b6d4", title = "Histograma", ...rest } = options;
  const mn = Math.min(...data),
    mx = Math.max(...data);
  const binW = (mx - mn) / bins;
  const counts = Array(bins).fill(0);
  data.forEach((v) => {
    const i = Math.min(Math.floor((v - mn) / binW), bins - 1);
    counts[i]++;
  });
  const labels = Array.from({ length: bins }, (_, i) =>
    (mn + (i + 0.5) * binW).toFixed(2),
  );
  return _API.barChart(labels, counts, {
    title,
    colors: Array(bins).fill(color),
    showValues: false,
    ...rest,
  });
};

/**
 * Plota a convergência de um método iterativo.
 * Aceita history (valores por iteração) ou errors (erros por iteração).
 * @param {number[]} values  Sequência de valores ou erros
 * @param {object}   [options]
 * @param {boolean}  [options.logScale=false]
 * @param {string}   [options.label='Convergência']
 */
_API.iterationPlot = (values, options = {}) => {
  const {
    logScale = false,
    label = "Convergência",
    color = "#f59e0b",
    ...rest
  } = options;
  const pts = values.map((v, i) => ({
    x: i,
    y: logScale && v > 0 ? Math.log10(v) : v,
  }));
  const yLabel = logScale ? "log₁₀(valor)" : "valor";
  const iv = [0, pts.length - 1];
  return _API.multiLineGraph2D(
    [{ points: pts, color, label, pointRadius: 3 }],
    iv,
    {
      pointHover: true,
      title: label + (logScale ? " (escala log)" : ""),
      showAxisMarks: true,
      ...rest,
    },
  );
};

/**
 * Gráfico de curva paramétrica 2D: (x(t), y(t)).
 * @param {Function} fx  x(t)
 * @param {Function} fy  y(t)
 * @param {[number,number]} tRange  Intervalo do parâmetro t
 * @param {object}   [options]
 */
_API.parametricCurve2D = (fx, fy, tRange = [0, 2 * Math.PI], options = {}) => {
  const {
    step = 0.01,
    width = 600,
    height = 400,
    color = "#a78bfa",
    ...rest
  } = options;
  const pts = [];
  for (let t = tRange[0]; t <= tRange[1] + 1e-12; t += step) {
    try {
      const x = fx(t),
        y = fy(t);
      if (isFinite(x) && isFinite(y)) pts.push({ x, y });
    } catch (_) {}
  }
  if (!pts.length) throw new Error("parametricCurve2D: nenhum ponto válido");
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  // Render como curva contínua usando função inversa implícita
  return _API.multiLineGraph2D(
    [{ func: null, points: [], color, label: options.label, _parametric: pts }],
    [xMin, xMax],
    { width, height, ...rest },
  );
};

// ─── Override multiLineGraph2D to support _parametric ───────
// (already handled — _parametric points are in .points via wrapper below)
_API.parametricCurve2D = (fx, fy, tRange = [0, 2 * Math.PI], options = {}) => {
  const {
    step = 0.01,
    width = 600,
    height = 400,
    color = "#a78bfa",
    theme = "light",
    padding = 48,
  } = options;
  const pts = [];
  for (let t = tRange[0]; t <= tRange[1] + 1e-12; t += step) {
    try {
      const x = fx(t),
        y = fy(t);
      if (isFinite(x) && isFinite(y)) pts.push({ x, y });
    } catch (_) {}
  }
  if (!pts.length) throw new Error("parametricCurve2D: nenhum ponto válido");
  // Draw directly
  const xs = pts.map((p) => p.x),
    ys = pts.map((p) => p.y);
  const xMin = Math.min(...xs),
    xMax = Math.max(...xs);
  const yMin = Math.min(...ys),
    yMax = Math.max(...ys);
  const canvas = _makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const T = _THEME[theme] || _THEME.light;
  const xR = xMax - xMin || 1,
    yR = yMax - yMin || 1;
  const adjXMin = xMin - xR * 0.08,
    adjXMax = xMax + xR * 0.08;
  const adjYMin = yMin - yR * 0.08,
    adjYMax = yMax + yR * 0.08;
  const toPxX = (x) =>
    padding + ((x - adjXMin) / (adjXMax - adjXMin)) * (width - 2 * padding);
  const toPxY = (y) =>
    height -
    padding -
    ((y - adjYMin) / (adjYMax - adjYMin)) * (height - 2 * padding);
  _drawGrid2D(
    ctx,
    toPxX,
    toPxY,
    adjXMin,
    adjXMax,
    adjYMin,
    adjYMax,
    padding,
    width,
    height,
    theme,
  );
  if (options.title) {
    ctx.fillStyle = T.text;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(options.title, width / 2, 18);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach((p, i) =>
    i === 0
      ? ctx.moveTo(toPxX(p.x), toPxY(p.y))
      : ctx.lineTo(toPxX(p.x), toPxY(p.y)),
  );
  ctx.stroke();
  return canvas;
};

/**
 * Campo vetorial 2D renderizado como setas normalizadas.
 * Detecta range automaticamente a partir dos vetores.
 * @param {object[]} vectors  Saída de vectorField2D
 * @param {object}   [options]
 */
_API.vectorialGraph2D = (vectors, options = {}) => {
  if (!vectors.length)
    throw new Error("vectorialGraph2D: array de vetores vazio");

  const {
    width = 600,
    height = 400,
    color = "#f97316",
    padding = 50,
    theme = "light",
  } = options;
  const canvas = _makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const T = _THEME[theme] || _THEME.light;

  // Auto-detect range from origins and tips
  let xMin = Infinity,
    xMax = -Infinity,
    yMin = Infinity,
    yMax = -Infinity;
  vectors.forEach((v) => {
    if (!v || !v.data || !v.origin) return;
    const ox = v.origin.x ?? v.origin[0] ?? 0;
    const oy = v.origin.y ?? v.origin[1] ?? 0;
    const tx = ox + v.data[0],
      ty = oy + v.data[1];
    xMin = Math.min(xMin, ox, tx);
    xMax = Math.max(xMax, ox, tx);
    yMin = Math.min(yMin, oy, ty);
    yMax = Math.max(yMax, oy, ty);
  });
  const margin = Math.max((xMax - xMin) * 0.1, (yMax - yMin) * 0.1, 0.5);
  xMin -= margin;
  xMax += margin;
  yMin -= margin;
  yMax += margin;

  // Normalize arrow lengths
  const mags = vectors.map((v) =>
    v.data ? Math.hypot(v.data[0], v.data[1]) : 0,
  );
  const maxMag = Math.max(...mags) || 1;

  const toPxX = (x) =>
    padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toPxY = (y) =>
    height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, width, height);

  // Grid & axes
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const vx = xMin + (i * (xMax - xMin)) / 8,
      vy = yMin + (i * (yMax - yMin)) / 8;
    ctx.beginPath();
    ctx.moveTo(toPxX(vx), padding);
    ctx.lineTo(toPxX(vx), height - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, toPxY(vy));
    ctx.lineTo(width - padding, toPxY(vy));
    ctx.stroke();
  }
  ctx.strokeStyle = T.axis;
  ctx.lineWidth = 1.5;
  const zY = Math.max(padding, Math.min(height - padding, toPxY(0)));
  const zX = Math.max(padding, Math.min(width - padding, toPxX(0)));
  ctx.beginPath();
  ctx.moveTo(padding, zY);
  ctx.lineTo(width - padding, zY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(zX, padding);
  ctx.lineTo(zX, height - padding);
  ctx.stroke();

  const cellW = (width - 2 * padding) / (xMax - xMin);
  const arrowLen = Math.min(cellW * 0.85, 30);

  vectors.forEach((v, idx) => {
    if (!v || !v.data || !Array.isArray(v.data) || v.data.length < 2) return;
    const ox = v.origin?.x ?? 0,
      oy = v.origin?.y ?? 0;
    const mag = mags[idx] || 1;
    const nx = v.data[0] / mag,
      ny = v.data[1] / mag;
    const scale = (mag / maxMag) * arrowLen;
    const x1 = toPxX(ox),
      y1 = toPxY(oy);
    const x2 = x1 + nx * scale,
      y2 = y1 - ny * scale; // y flipped

    // Color by magnitude
    const t = mag / maxMag;
    const r = Math.round(6 + t * 249),
      g = Math.round(182 - t * 61),
      b2 = Math.round(212 - t * 185);
    ctx.strokeStyle = `rgb(${r},${g},${b2})`;
    ctx.fillStyle = `rgb(${r},${g},${b2})`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - 7 * Math.cos(angle - 0.45),
      y2 - 7 * Math.sin(angle - 0.45),
    );
    ctx.lineTo(
      x2 - 7 * Math.cos(angle + 0.45),
      y2 - 7 * Math.sin(angle + 0.45),
    );
    ctx.closePath();
    ctx.fill();
  });
  return canvas;
};

// ════════════════════════════════════════════════════════════
// § 8  RENDERIZAÇÃO 3D
// ════════════════════════════════════════════════════════════

/**
 * Cena 3D interativa com rotação por arrasto e zoom por scroll.
 * @param {object[]} objects  Objetos PlotterAPI (point3D, vector3D, polyhedron, surface, etc.)
 * @param {object}   [options]
 * @param {number}   [options.width=600]
 * @param {number}   [options.height=400]
 * @param {number}   [options.scale=25]
 * @param {boolean}  [options.interactive=true]
 * @param {[number,number]} [options.range=[-5,5]]
 * @param {boolean}  [options.showAxes=true]
 * @param {boolean}  [options.showAxisLabels=true]
 * @param {number}   [options.step=0.5]
 * @param {number}   [options.initialPitch=0.6]
 * @param {number}   [options.initialYaw=0.8]
 */
_API.scene3D = (objects, options = {}) => {
  const {
    width = 600,
    height = 400,
    scale: initScale = 25,
    interactive = true,
    range = [-5, 5],
    showAxes = true,
    showAxisLabels = true,
    step = 0.5,
    initialPitch = 0.6,
    initialYaw = 0.8,
  } = options;

  const canvas = _makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  let pitch = initialPitch,
    yaw = initialYaw,
    sc = initScale;
  const [rMin, rMax] = Array.isArray(range[0]) ? range : [range[0], range[1]];

  const project = (x, y, z) => {
    const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
    const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
    const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
    const pz = y * Math.sin(pitch) + rz * Math.cos(pitch);
    return { px: width / 2 + rx * sc, py: height / 2 - ry * sc, pz };
  };

  const render = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    if (showAxes) {
      const origin = project(0, 0, 0);
      const axDef = [
        [rMax, 0, 0, "#ef4444", "X"],
        [0, rMax, 0, "#22c55e", "Y"],
        [0, 0, rMax, "#3b82f6", "Z"],
      ];
      axDef.forEach(([ax, ay, az, col, lbl]) => {
        const tip = project(ax, ay, az);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(origin.px, origin.py);
        ctx.lineTo(tip.px, tip.py);
        ctx.stroke();
        if (showAxisLabels) {
          ctx.fillStyle = col;
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(lbl, tip.px, tip.py - 5);
        }
      });
    }

    ctx.lineJoin = "round";

    // Depth-sort all objects
    const drawCalls = [];
    objects.forEach((obj, oi) => {
      if (!obj) return;
      const color = obj.color || "#e2e8f0";
      const lw = obj.lineWidth || 2;
      if (obj.type === "point3D") {
        const p = project(...obj.coords);
        drawCalls.push({
          z: p.pz,
          fn: () => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.px, p.py, obj.radius || 5, 0, Math.PI * 2);
            ctx.fill();
            if (obj.label) {
              ctx.fillStyle = "#e2e8f0";
              ctx.font = "10px monospace";
              ctx.textAlign = "left";
              ctx.fillText(obj.label, p.px + 7, p.py - 4);
            }
          },
        });
      } else if (obj.type === "vector3D") {
        const o = obj.origin,
          end = o.map((v, i) => v + obj.dir[i]);
        const p1 = project(...o),
          p2 = project(...end);
        drawCalls.push({
          z: (p1.pz + p2.pz) / 2,
          fn: () => {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
            const angle = Math.atan2(p2.py - p1.py, p2.px - p1.px);
            ctx.beginPath();
            ctx.moveTo(p2.px, p2.py);
            ctx.lineTo(
              p2.px - 10 * Math.cos(angle - 0.5),
              p2.py - 10 * Math.sin(angle - 0.5),
            );
            ctx.lineTo(
              p2.px - 10 * Math.cos(angle + 0.5),
              p2.py - 10 * Math.sin(angle + 0.5),
            );
            ctx.closePath();
            ctx.fill();
            if (obj.label) {
              ctx.fillStyle = "#e2e8f0";
              ctx.font = "10px monospace";
              ctx.textAlign = "left";
              ctx.fillText(obj.label, p2.px + 6, p2.py - 4);
            }
          },
        });
      } else if (obj.type === "line3D") {
        const t = 50,
          p0 = obj.p0,
          d = obj.dir;
        const e1 = project(
          p0[0] - d[0] * t,
          p0[1] - d[1] * t,
          p0[2] - d[2] * t,
        );
        const e2 = project(
          p0[0] + d[0] * t,
          p0[1] + d[1] * t,
          p0[2] + d[2] * t,
        );
        drawCalls.push({
          z: (e1.pz + e2.pz) / 2,
          fn: () => {
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.moveTo(e1.px, e1.py);
            ctx.lineTo(e2.px, e2.py);
            ctx.stroke();
          },
        });
      } else if (obj.type === "plane3D") {
        const [a, b, c, d] = obj.eq;
        ctx.globalAlpha = obj.opacity ?? 0.4;
        const drawPlaneGrid = (isCross) => {
          for (let u = rMin; u <= rMax; u += step) {
            const pts = [];
            for (let v2 = rMin; v2 <= rMax; v2 += step) {
              let x, y, z;
              if (Math.abs(b) > 0.01) {
                x = isCross ? v2 : u;
                z = isCross ? u : v2;
                y = (-d - a * x - c * z) / b;
              } else if (Math.abs(c) > 0.01) {
                x = isCross ? v2 : u;
                y = isCross ? u : v2;
                z = (-d - a * x - b * y) / c;
              } else {
                y = isCross ? v2 : u;
                z = isCross ? u : v2;
                x = (-d - b * y - c * z) / a;
              }
              if (isFinite(x) && isFinite(y) && isFinite(z))
                pts.push(project(x, y, z));
            }
            if (pts.length < 2) continue;
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pts[0].px, pts[0].py);
            pts.slice(1).forEach((p) => ctx.lineTo(p.px, p.py));
            ctx.stroke();
          }
        };
        drawCalls.push({
          z: 0,
          fn: () => {
            drawPlaneGrid(false);
            drawPlaneGrid(true);
            ctx.globalAlpha = 1;
          },
        });
      } else if (obj.type === "surface") {
        ctx.lineWidth = 0.8;
        const drawSurfaceGrid = (isCross) => {
          for (let u = rMin; u <= rMax; u += step) {
            const pts = [];
            for (let v2 = rMin; v2 <= rMax; v2 += step) {
              const x = isCross ? v2 : u,
                z = isCross ? u : v2;
              try {
                const y = obj.func(x, z);
                if (isFinite(y)) pts.push(project(x, y, z));
              } catch (_) {}
            }
            if (pts.length < 2) continue;
            ctx.beginPath();
            ctx.moveTo(pts[0].px, pts[0].py);
            pts.slice(1).forEach((p) => ctx.lineTo(p.px, p.py));
            ctx.stroke();
          }
        };
        drawCalls.push({
          z: -Infinity,
          fn: () => {
            ctx.strokeStyle = color;
            drawSurfaceGrid(false);
            drawSurfaceGrid(true);
          },
        });
      } else if (obj.type === "segments3D") {
        obj.segments.forEach((seg) => {
          const p1 = project(...seg[0]),
            p2 = project(...seg[1]);
          drawCalls.push({
            z: (p1.pz + p2.pz) / 2,
            fn: () => {
              if (obj.dashed) ctx.setLineDash([5, 5]);
              ctx.strokeStyle = color;
              ctx.lineWidth = lw;
              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.stroke();
              ctx.setLineDash([]);
            },
          });
        });
      } else if (obj.type === "polyhedron") {
        const pv = obj.vertices.map((v) => project(...v));
        obj.faces.forEach((fi) => {
          const pts = fi.map((i) => pv[i]);
          const avgZ = pts.reduce((s, p) => s + p.pz, 0) / pts.length;
          const fillColor = obj.fillColor || color + "33";
          const strokeColor = color;
          drawCalls.push({
            z: avgZ,
            fn: () => {
              ctx.beginPath();
              pts.forEach((p, i) =>
                i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py),
              );
              ctx.closePath();
              ctx.fillStyle = fillColor;
              ctx.fill();
              if (obj.showMesh !== false) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = lw * 0.5;
                ctx.stroke();
              }
            },
          });
        });
      }
    });

    // Painter's algorithm: back to front
    drawCalls.sort((a, b) => b.z - a.z);
    drawCalls.forEach((dc) => dc.fn());
  };

  render();

  if (interactive) {
    let dragging = false,
      lastMouse = { x: 0, y: 0 };

    canvas.addEventListener("mousedown", (e) => {
      dragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      yaw += (e.clientX - lastMouse.x) * 0.01;
      pitch += (e.clientY - lastMouse.y) * 0.01;
      // Clamp pitch
      pitch = Math.max(
        -Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, pitch),
      );
      lastMouse = { x: e.clientX, y: e.clientY };
      render();
    });
    canvas.addEventListener("mouseup", () => {
      dragging = false;
      canvas.style.cursor = "grab";
    });
    canvas.addEventListener("mouseleave", () => {
      dragging = false;
      canvas.style.cursor = "default";
    });

    // Zoom via scroll
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        sc = Math.max(4, Math.min(200, sc - e.deltaY * 0.05));
        render();
      },
      { passive: false },
    );

    // Touch support
    let lastTouchDist = 0;
    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          dragging = true;
          lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
        }
      },
      { passive: true },
    );
    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 1 && dragging) {
          yaw += (e.touches[0].clientX - lastMouse.x) * 0.01;
          pitch += (e.touches[0].clientY - lastMouse.y) * 0.01;
          pitch = Math.max(
            -Math.PI / 2 + 0.05,
            Math.min(Math.PI / 2 - 0.05, pitch),
          );
          lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          render();
        } else if (e.touches.length === 2) {
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          sc = Math.max(4, Math.min(200, sc * (d / lastTouchDist)));
          lastTouchDist = d;
          render();
        }
      },
      { passive: true },
    );
    canvas.addEventListener(
      "touchend",
      () => {
        dragging = false;
      },
      { passive: true },
    );

    canvas.style.cursor = "grab";

    // Expose render for external updates (e.g., adding objects later)
    canvas._rerender = render;
  }

  return canvas;
};

/**
 * Superfície 3D z = f(x, z) com opções de colormap.
 * @param {Function} func   f(x, z) → y
 * @param {[number,number]} [rangeX=[-5,5]]
 * @param {[number,number]} [rangeZ=[-5,5]]
 * @param {object}   [options]
 * @param {string}   [options.colorX='#38bdf8']  Cor das isolinhas x
 * @param {string}   [options.colorZ]             Cor das isolinhas z (padrão = colorX)
 */
_API.graph3D = (func, rangeX = [-5, 5], rangeZ = [-5, 5], options = {}) => {
  const { colorX = "#38bdf8", colorZ } = options;
  return _API.scene3D(
    [{ type: "surface", func, color: colorX, colorZ: colorZ || colorX }],
    { ...options, range: rangeX },
  );
};

/**
 * Curva paramétrica 3D: (x(t), y(t), z(t)).
 */
_API.parametricCurve3D = (
  fx,
  fy,
  fz,
  tRange = [0, 2 * Math.PI],
  options = {},
) => {
  const { step = 0.02, color = "#a78bfa" } = options;
  const segs = [];
  let prev = null;
  for (let t = tRange[0]; t <= tRange[1] + 1e-12; t += step) {
    try {
      const x = fx(t),
        y = fy(t),
        z = fz(t);
      if (isFinite(x) && isFinite(y) && isFinite(z)) {
        if (prev) segs.push([prev, [x, y, z]]);
        prev = [x, y, z];
      } else {
        prev = null;
      }
    } catch (_) {
      prev = null;
    }
  }
  return _API.scene3D(
    [{ type: "segments3D", segments: segs, color, lineWidth: 2 }],
    { ...options },
  );
};

// ════════════════════════════════════════════════════════════
// § 9  DEBUG E VALIDAÇÃO
// ════════════════════════════════════════════════════════════

/** Versão da API */
_API.version = "3.0.0";

/** Executa bateria de testes internos. Retorna true se todos passaram. */
_API._testAll = () => {
  const tests = {
    point3D: () => {
      const p = _API.point3D(1, 2, 3);
      if (p.type !== "point3D") throw new Error("type");
    },
    vector3D: () => {
      const v = _API.vector3D(1, 2, 3);
      if (!v.dir) throw new Error("dir");
    },
    vectorMag: () => {
      const v = _API.vector3D(3, 4, 0);
      if (Math.abs(_API.vectorMag(v) - 5) > 1e-6) throw new Error();
    },
    vectorDot: () => {
      if (_API.vectorDot([1, 0, 0], [0, 1, 0]) !== 0) throw new Error();
    },
    vectorCross: () => {
      const c = _API.vectorCross([1, 0, 0], [0, 1, 0]);
      if (c[2] !== 1) throw new Error();
    },
    angleBetween: () => {
      const a = _API.angleBetween([1, 0, 0], [0, 1, 0]);
      if (Math.abs(a - 90) > 1e-4) throw new Error();
    },
    matrix: () => {
      _API.matrix([
        [1, 2],
        [3, 4],
      ]);
    },
    "matrixDet 2x2": () => {
      const d = _API.matrixDet(
        _API.matrix([
          [1, 2],
          [3, 4],
        ]),
      );
      if (Math.abs(d + 2) > 1e-8) throw new Error("det=" + d);
    },
    "matrixDet 3x3": () => {
      const d = _API.matrixDet(
        _API.matrix([
          [2, 1, 3],
          [0, 4, 1],
          [1, 2, 5],
        ]),
      );
      if (Math.abs(d - 25) > 1e-6) throw new Error("det=" + d);
    },
    matrixInverse: () => {
      const m = _API.matrix([
        [2, 1],
        [5, 3],
      ]);
      const inv = _API.matrixInverse(m);
      const r = _API.matrixMult(m, inv);
      if (Math.abs(r.data[0][0] - 1) > 1e-8) throw new Error();
    },
    luDecomposition: () => {
      const r = _API.luDecomposition(
        _API.matrix([
          [2, 1],
          [5, 3],
        ]),
      );
      if (!r.L || !r.U) throw new Error();
    },
    gaussianElim: () => {
      const A = _API.matrix([
        [2, -1, 0],
        [1, 2, 1],
        [0, -1, 2],
      ]);
      const { x } = _API.gaussianElimination(A, [1, 3, 5]);
      if (Math.abs(x[0] - 0.5) > 1e-6) throw new Error("x=" + x);
    },
    jacobi: () => {
      const A = _API.matrix([
        [4, -1, 0],
        [-1, 4, -1],
        [0, -1, 4],
      ]);
      const r = _API.jacobi(A, [15, 10, 10]);
      if (!r.converged) throw new Error("não convergiu");
    },
    gaussSeidel: () => {
      const A = _API.matrix([
        [4, -1, 0],
        [-1, 4, -1],
        [0, -1, 4],
      ]);
      const r = _API.gaussSeidel(A, [15, 10, 10]);
      if (!r.converged) throw new Error();
    },
    derivative: () => {
      const df = _API.derivative((x) => x * x);
      if (Math.abs(df(3) - 6) > 1e-4) throw new Error("df(3)=" + df(3));
    },
    derivative2: () => {
      const d2f = _API.derivative2((x) => x * x * x);
      if (Math.abs(d2f(2) - 12) > 1e-2) throw new Error();
    },
    trapezoidalRule: () => {
      const v = _API.trapezoidalRule((x) => x * x, 0, 1, 1000);
      if (Math.abs(v - 1 / 3) > 1e-4) throw new Error("val=" + v);
    },
    simpsonRule: () => {
      const v = _API.simpsonRule((x) => x * x, 0, 1, 1000);
      if (Math.abs(v - 1 / 3) > 1e-6) throw new Error("val=" + v);
    },
    pointList: () => {
      const p = _API.pointList((x) => x * x, [-2, 2], 0.5);
      if (p.length < 9) throw new Error();
    },
    interpolationGN: () => {
      const f = _API.interpolationGN([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ]);
      if (Math.abs(f(1) - 1) > 1e-8) throw new Error();
    },
    lagrange: () => {
      const f = _API.lagrangeInterpolation([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ]);
      if (Math.abs(f(1) - 1) > 1e-8) throw new Error();
    },
    newtonDividedDiff: () => {
      const { poly } = _API.newtonDividedDiff([
        { x: 0, y: 1 },
        { x: 1, y: 3 },
        { x: 3, y: 2 },
      ]);
      poly(2);
    },
    splineLinear: () => {
      const f = _API.splineLinear([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
      ]);
      if (Math.abs(f(0.5) - 0.5) > 1e-8) throw new Error();
    },
    leastSquares: () => {
      const { poly, rSquared } = _API.leastSquares(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        1,
      );
      if (Math.abs(rSquared - 1) > 1e-6) throw new Error();
    },
    bisection: () => {
      const r = _API.bisection((x) => x * x - 2, 1, 2);
      if (Math.abs(r.root * r.root - 2) > 1e-6) throw new Error();
    },
    newtonRaphson: () => {
      const r = _API.newtonRaphson((x) => x * x - 2, 1.5);
      if (Math.abs(r.root * r.root - 2) > 1e-8) throw new Error();
    },
    secant: () => {
      const r = _API.secant((x) => x * x - 2, 1, 2);
      if (Math.abs(r.root * r.root - 2) > 1e-8) throw new Error();
    },
    fixedPoint: () => {
      const r = _API.fixedPoint((x) => Math.cos(x), 0.5);
      if (Math.abs(r.root - 0.7390851332) > 1e-5) throw new Error();
    },
    regulaFalsi: () => {
      const r = _API.regulaFalsi((x) => x * x - 2, 1, 2);
      if (Math.abs(r.root * r.root - 2) > 1e-6) throw new Error();
    },
    eulerMethod: () => {
      const r = _API.eulerMethod((t, y) => -y, 1, 0, 1, 0.01);
      if (Math.abs(r.y.at(-1) - Math.exp(-1)) > 0.02) throw new Error();
    },
    eulerImproved: () => {
      const r = _API.eulerImproved((t, y) => -y, 1, 0, 1, 0.1);
      if (Math.abs(r.y.at(-1) - Math.exp(-1)) > 0.005) throw new Error();
    },
    rungeKutta4: () => {
      const r = _API.rungeKutta4((t, y) => -y, 1, 0, 1, 0.1);
      if (Math.abs(r.y.at(-1) - Math.exp(-1)) > 1e-5) throw new Error();
    },
    rungeKutta4System: () => {
      const r = _API.rungeKutta4System((t, [y]) => [-y], [1], 0, 1, 0.1);
      if (Math.abs(r.Y.at(-1)[0] - Math.exp(-1)) > 1e-5) throw new Error();
    },
    linspace: () => {
      const a = _API.linspace(0, 1, 5);
      if (a.length !== 5 || Math.abs(a[4] - 1) > 1e-9) throw new Error();
    },
    range: () => {
      const a = _API.range(0, 4, 1);
      if (a.length !== 5) throw new Error();
    },
    "leastSquares r²": () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ];
      const { rSquared } = _API.leastSquares(pts, 1);
      if (Math.abs(rSquared - 1) > 1e-6) throw new Error();
    },
    cube: () => {
      const c = _API.cube(2);
      if (c.vertices.length !== 8) throw new Error();
    },
    sphere: () => {
      _API.sphere(1, [0, 0, 0], 8);
    },
    torus: () => {
      const t = _API.torus(2, 0.5);
      if (!t.vertices.length) throw new Error();
    },
    tetrahedron: () => {
      const t = _API.tetrahedron();
      if (t.faces.length !== 4) throw new Error();
    },
    vectorField2D: () => {
      const v = _API.vectorField2D(
        (x) => -x,
        (x, y) => y,
        [-2, 2],
        [-2, 2],
        1,
      );
      if (!v.length) throw new Error();
    },
    conic2D: () => {
      const [f1] = _API.conic2D(1, 0, 1, 0, 0, -4);
      if (!isFinite(f1(0))) throw new Error();
    },
    "mean/stddev": () => {
      const a = [1, 2, 3, 4, 5];
      if (Math.abs(_API.mean(a) - 3) > 1e-9) throw new Error();
    },
    historyToPoints: () => {
      const pts = _API.historyToPoints([0.5, 0.2, 0.05]);
      if (pts.length !== 3) throw new Error();
    },
  };

  let pass = 0,
    fail = 0;
  const fails = [];
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      pass++;
    } catch (err) {
      fail++;
      fails.push(`${name}: ${err.message}`);
    }
  }
  if (typeof console !== "undefined") {
    console.group(`PlotterAPI v${_API.version} — Validation`);
    console.log(
      `%c${pass}/${pass + fail} testes passaram`,
      `color:${fail > 0 ? "orange" : "green"};font-weight:bold`,
    );
    fails.forEach((f) => console.warn("%c✗ " + f, "color:red"));
    console.groupEnd();
  }
  return fail === 0;
};

// ════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════

const PlotterAPI = _API;

if (typeof module !== "undefined" && module.exports) {
  module.exports = PlotterAPI;
  module.exports.default = PlotterAPI;
}
if (typeof window !== "undefined") {
  window.PlotterAPI = PlotterAPI;
  window.__PlotterAPI_v3_loaded = true;
}

window.PlotterAPI = PlotterAPI;
