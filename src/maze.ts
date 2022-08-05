type MazeCellInfo = [rightConnected: boolean, bottomConnected: boolean];
type ConnectionInfo = MazeCellInfo[][];

export function generateMaze(width: number, height: number): ConnectionInfo {
  const connections: ConnectionInfo = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [false, false])
  );
  // remove some random walls
  const times = width * height;
  for (let i = 0; i < times; i += 1) {
    const w = (Math.random() * width) | 0;
    const h = (Math.random() * height) | 0;
    const j = (Math.random() * 2) | 0;
    if ((w < width - 1 || j) && (h < height - 1 || !j)) {
      connections[w][h][j] = true;
    }
  }
  // make sure all cells are connected
  const visited = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => false)
  );
  visited[0][0] = true;
  const borders = new Map<number, boolean[]>();
  const queue = [[0, 0]];
  const updateBorder = (bx: number, by: number, j: number, v: boolean) => {
    const k = point2index(width, bx, by);
    let items = borders.get(k);
    if (v && !items) {
      items = [];
      borders.set(k, items);
    }
    if (items) {
      items[j] = v;
      if (!items[0] && !items[1]) {
        borders.delete(k);
      }
    }
  };
  const checkBorder = (bx: number, by: number, j: number) => {
    const x = bx + +!j;
    const y = by + j;
    if (bx < 0 || x >= width || by < 0 || y >= height) return;
    const hasBorder =
      visited[x][y] !== visited[bx][by] && !connections[bx][by][j];
    // if (hasBorder) {
    //   console.log('set border', bx, by, j);
    // }
    updateBorder(bx, by, j, hasBorder);
  };
  const check = (x0: number, y0: number, dx: number, dy: number) => {
    const x = x0 + dx;
    const y = y0 + dy;
    if (x < 0 || x >= width || y < 0 || y >= height || visited[x][y]) return;
    const bx = Math.min(x0, x);
    const by = Math.min(y0, y);
    const j = +!dx;
    if (connections[bx][by][j]) {
      visited[x][y] = true;
      // console.log('add queue', x, y);
      queue.push([x, y]);
      checkBorder(x, y, 0);
      checkBorder(x, y, 1);
      checkBorder(x - 1, y, 0);
      checkBorder(x, y - 1, 1);
    } else {
      checkBorder(bx, by, j);
    }
  };
  for (let r = 0; r < times; r += 1) {
    while (queue.length) {
      const [x, y] = queue.shift();
      // console.log('visit', x, y);
      check(x, y, 0, -1);
      check(x, y, 0, 1);
      check(x, y, -1, 0);
      check(x, y, 1, 0);
    }
    if (!borders.size) {
      // console.log('round', r);
      break;
    }
    const keys = Array.from(borders.keys());
    const key = keys[(keys.length * Math.random()) | 0];
    const items = borders.get(key);
    const j = items.findIndex(Boolean);
    const [x, y] = index2point(width, key);
    // console.log(borders);
    // console.log(reprMaze(connections, visited));
    // console.log('remove border', x, y, j);
    connections[x][y][j] = true;
    updateBorder(x, y, j, false);
    queue.push([x, y], [x + +!j, y + j]);
  }
  // console.log(borders);
  // console.log(reprMaze(connections, visited));
  return connections;
}

export const Directions = [
  [0, 1], // up
  [-1, 0], // left
  [0, -1], // bottom
  [1, 0] // right
];

export function isConnected(connections: ConnectionInfo, x: number, y: number, directionType: number) {
  const width = connections.length;
  const height = connections[0].length;
  if (x < 0 || x >= width || y < 0 || y >= height) return false;
  const [dx, dy] = Directions[directionType];
  const tx = x + dx;
  const ty = y + dy;
  if (tx < 0 || tx >= width || ty < 0 || ty >= height) return false;
  if (dx < 0) return connections[tx][ty][0];
  if (dx > 0) return connections[x][y][0];
  if (dy < 0) return connections[tx][ty][1];
  return connections[x][y][1];
}

export function reprMaze(connections: ConnectionInfo, visited: boolean[][]) {
  const output = [];
  const width = connections.length;
  const height = connections[0].length;
  for (let i = 0; i < height; i += 1) {
    const line1 = [];
    const line2 = [];
    for (let j = 0; j < width; j += 1) {
      const conn = connections[j][i];
      line1.push(!visited || visited[j][i] ? " " : "x");
      line1.push(conn[0] ? " " : "|");
      line2.push(conn[1] ? " " : "-");
      line2.push(
        !conn[1] ||
          !(connections[j + 1]?.[i][1] ?? true) ||
          !conn[0] ||
          !(connections[j][i + 1]?.[0] ?? true)
          ? "+"
          : " "
      );
    }
    output.push(line1.join(""), line2.join(""));
  }
  return output.join("\n");
}

function point2index(width: number, x: number, y: number) {
  return y * width + x;
}

function index2point(width: number, i: number) {
  const x = i % width;
  const y = (i / width) | 0;
  return [x, y];
}

export function getLines(connections: ConnectionInfo) {
  const width = connections.length;
  const height = connections[0].length;
  const borders = new Map<number, Set<number>>();
  const subset = () => new Set<number>();
  const addBorder = (i1: number, i2: number) => {
    setDefault(borders, i1, subset).add(i2);
    setDefault(borders, i2, subset).add(i1);
  };
  const delBorder = (i1: number, i2: number) => {
    removeItem(borders, i1, i2);
    removeItem(borders, i2, i1);
  };
  for (let i = 0; i < width; i += 1) {
    for (let j = 0; j < height; j += 1) {
      const conn = connections[i][j];
      if (!conn[0]) {
        addBorder(
          point2index(width + 1, i + 1, j),
          point2index(width + 1, i + 1, j + 1)
        );
      }
      if (!conn[1]) {
        addBorder(
          point2index(width + 1, i, j + 1),
          point2index(width + 1, i + 1, j + 1)
        );
      }
    }
  }
  const lines = [];
  while (borders.size) {
    let key: number;
    let size = Infinity;
    for (const [k, set] of borders.entries()) {
      if (set.size < size) {
        size = set.size;
        key = k;
      }
    }
    const indices = [key];
    while (true) {
      const set = borders.get(key);
      if (!set?.size) break;
      const one = set.values().next().value;
      indices.push(one);
      delBorder(key, one);
      key = one;
    }
    const points = indices.map(idx => index2point(width + 1, idx));
    const line = points.slice(0, 2);
    for (let i = 2; i < points.length; i += 1) {
      const p1 = line.at(-2);
      const p2 = line.at(-1);
      const p3 = points[i];
      if ([0, 1].some((j) => p1[j] === p2[j] && p2[j] === p3[j])) {
        line.pop();
      }
      line.push(p3);
    }
    // console.log("xxx", indices, points, line);
    lines.push(line);
  }
  // console.log("yyy", connections);
  return lines;
}

function setDefault<T, U>(map: Map<T, U>, key: T, def: () => U) {
  let sub = map.get(key);
  if (!sub) {
    sub = def();
    map.set(key, sub);
  }
  return sub;
}

function removeItem<T, U>(map: Map<T, Set<U>>, key: T, item: U) {
  const items = map.get(key);
  if (items) {
    items.delete(item);
    if (!items.size) map.delete(key);
  }
}
