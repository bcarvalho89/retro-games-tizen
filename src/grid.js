export function moveGrid(index, dir, count, cols = 4) {
  if (count <= 0) return 0;
  const col = index % cols;
  if (dir === 'left') return col > 0 ? index - 1 : index;
  if (dir === 'right') return col < cols - 1 && index + 1 < count ? index + 1 : index;
  if (dir === 'up') return index - cols >= 0 ? index - cols : index;
  if (dir === 'down') {
    if (index + cols < count) return index + cols;
    const lastRowStart = count - 1 - ((count - 1) % cols);
    return index < lastRowStart ? count - 1 : index;
  }
  return index;
}
