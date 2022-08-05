const S = 0b100000;
const E = 0b010000;
const R = 0b000001;
const L = 0b000010;
const U = 0b000100;
const D = 0b001000;
const directionNames: Record<number, string> = {
  [S]: "S",
  [E]: "E",
  [R]: "R",
  [L]: "L",
  [U]: "U",
  [D]: "D"
};

type Point = [number, number];
type Vector = [number, number];

const corners: Record<number, Vector> = {
  [R | U]: [-1, 1],
  [R | D]: [1, 1],
  [L | U]: [-1, -1],
  [L | D]: [1, -1],
  [S | U]: [-1, -1],
  [S | D]: [1, 1],
  [S | L]: [1, -1],
  [S | R]: [-1, 1],
  [U | E]: [-1, 1],
  [D | E]: [1, -1],
  [L | E]: [-1, -1],
  [R | E]: [1, 1]
};

function getCornerPoint(p1: Point, p2: Point, p3: Point, halfDepth: number) {
  const corner = getCorner(p1, p2, p3);
  // console.log(reprEnum(corner));
  const [offX, offY] = corners[corner];
  return [p2[0] + offX * halfDepth, p2[1] + offY * halfDepth];
}

function getDirection(p1: Point, p2: Point) {
  if (!p1) return S;
  if (!p2) return E;
  if (p1[0] < p2[0]) return R;
  if (p1[0] > p2[0]) return L;
  if (p1[1] < p2[1]) return U;
  return D;
}

function getCorner(p1: Point, p2: Point, p3: Point) {
  const d1 = getDirection(p1, p2);
  const d2 = getDirection(p2, p3);
  if (d1 === d2) {
    console.log(p1, p2, p3, reprEnum(d1), reprEnum(d2));
    throw new Error("no corner");
  }
  const d = d1 | d2;
  return d;
}

export function getOutlinePoints(points: Point[], halfDepth: number) {
  const outlinePoints = [];
  for (let i = 0; i < points.length; i += 1) {
    outlinePoints.push(
      getCornerPoint(points[i - 1], points[i], points[i + 1], halfDepth)
    );
  }
  for (let i = points.length - 1; i >= 0; i -= 1) {
    outlinePoints.push(
      getCornerPoint(points[i + 1], points[i], points[i - 1], halfDepth)
    );
  }
  return outlinePoints;
}

function reprEnum(value: number) {
  const keys = Object.keys(directionNames).map((v) => +v);
  const enums: string[] = [];
  while (value) {
    const key = keys.find((k) => (value & k) === k);
    if (!key) {
      throw new Error("Invalid enum");
    }
    enums.push(directionNames[key]);
    value -= key;
  }
  return enums.join(" | ");
}
