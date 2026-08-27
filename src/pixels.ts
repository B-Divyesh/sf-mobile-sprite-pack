export type PaletteName = 'original' | 'pico8' | 'gameboy' | 'cga' | 'custom';
export type DitherName = 'none' | 'floyd';

export interface PixelFrame {
  data: ImageData;
  duration: number;
  name: string;
}

export interface TransformOptions {
  trim: boolean;
  padding: number;
  palette: PaletteName;
  dither: DitherName;
  customPalette: string;
}

export const PALETTES: Record<Exclude<PaletteName, 'original' | 'custom'>, string[]> = {
  pico8: ['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'],
  gameboy: ['#0f380f','#306230','#8bac0f','#9bbc0f'],
  cga: ['#101a22','#ef6a5b','#62d2a2','#fff5d6']
};

export function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '');
  if (!/^[\da-f]{6}$/i.test(value)) return null;
  return [Number.parseInt(value.slice(0,2),16), Number.parseInt(value.slice(2,4),16), Number.parseInt(value.slice(4,6),16)];
}

export function parseCustomPalette(value: string): [number, number, number][] {
  return value.split(/[\s,]+/).map(hexToRgb).filter((color): color is [number,number,number] => color !== null).slice(0,32);
}

function nearestColor(r: number, g: number, b: number, palette: [number,number,number][]) {
  let match = palette[0];
  let distance = Number.POSITIVE_INFINITY;
  for (const color of palette) {
    const dr = r-color[0], dg = g-color[1], db = b-color[2];
    const score = dr*dr*.299 + dg*dg*.587 + db*db*.114;
    if (score < distance) { distance = score; match = color; }
  }
  return match;
}

export function findOpaqueBounds(data: Uint8ClampedArray, width: number, height: number) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    if (data[(y*width+x)*4+3] === 0) continue;
    left = Math.min(left,x); right = Math.max(right,x); top = Math.min(top,y); bottom = Math.max(bottom,y);
  }
  return right < left ? { left:0, top:0, right:0, bottom:0, width:1, height:1 } : { left,top,right,bottom,width:right-left+1,height:bottom-top+1 };
}

export function transformPixels(source: ImageData, options: TransformOptions): ImageData {
  const bounds = options.trim ? findOpaqueBounds(source.data, source.width, source.height) : {left:0,top:0,width:source.width,height:source.height};
  const width = bounds.width + options.padding*2;
  const height = bounds.height + options.padding*2;
  const output = new ImageData(width,height);
  for (let y=0; y<bounds.height; y++) for (let x=0; x<bounds.width; x++) {
    const from = ((y+bounds.top)*source.width+(x+bounds.left))*4;
    const to = ((y+options.padding)*width+(x+options.padding))*4;
    output.data[to]=source.data[from]; output.data[to+1]=source.data[from+1]; output.data[to+2]=source.data[from+2]; output.data[to+3]=source.data[from+3];
  }
  if (options.palette === 'original') return output;
  const palette = options.palette === 'custom' ? parseCustomPalette(options.customPalette) : PALETTES[options.palette].map(hexToRgb).filter((c): c is [number,number,number]=>c!==null);
  if (!palette.length) return output;
  const working = new Float32Array(output.data);
  for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
    const index = (y*width+x)*4;
    if (working[index+3] === 0) continue;
    const old: [number,number,number] = [working[index],working[index+1],working[index+2]];
    const match = nearestColor(...old,palette);
    output.data[index]=match[0]; output.data[index+1]=match[1]; output.data[index+2]=match[2];
    if (options.dither === 'floyd') {
      const errors = [old[0]-match[0],old[1]-match[1],old[2]-match[2]];
      const spread = (nx:number,ny:number,factor:number) => {
        if (nx<0 || nx>=width || ny<0 || ny>=height) return;
        const ni=(ny*width+nx)*4; if (working[ni+3]===0) return;
        for(let c=0;c<3;c++) working[ni+c]=Math.max(0,Math.min(255,working[ni+c]+errors[c]*factor));
      };
      spread(x+1,y,7/16); spread(x-1,y+1,3/16); spread(x,y+1,5/16); spread(x+1,y+1,1/16);
    }
  }
  return output;
}

export function validateGrid(width: number, height: number, columns: number, rows: number): { columns: number; rows: number } {
  const validateCount = (value: number, label: 'Columns' | 'Rows', limit: number) => {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > limit) {
      throw new Error(`${label} must be a whole number from 1 to ${limit}.`);
    }
  };
  validateCount(columns, 'Columns', Math.min(64, width));
  validateCount(rows, 'Rows', Math.min(64, height));
  if (width % columns !== 0 || height % rows !== 0) {
    throw new Error(`The ${width} × ${height}px source must divide evenly into ${columns} columns and ${rows} rows. Choose a grid that leaves no pixels behind.`);
  }
  return { columns, rows };
}

export function sliceGrid(source: PixelFrame, columns: number, rows: number): PixelFrame[] {
  const grid = validateGrid(source.data.width, source.data.height, columns, rows);
  const cellWidth = source.data.width/grid.columns;
  const cellHeight = source.data.height/grid.rows;
  const frames: PixelFrame[] = [];
  for (let row=0; row<grid.rows; row++) for (let column=0; column<grid.columns; column++) {
    const image = new ImageData(cellWidth,cellHeight);
    for (let y=0;y<cellHeight;y++) for(let x=0;x<cellWidth;x++) {
      const from=((row*cellHeight+y)*source.data.width+column*cellWidth+x)*4;
      const to=(y*cellWidth+x)*4;
      image.data.set(source.data.data.subarray(from,from+4),to);
    }
    frames.push({ data:image, duration:source.duration, name:`${source.name}-${String(frames.length+1).padStart(2,'0')}` });
  }
  return frames;
}

export function suggestGrid(width: number, height: number): { columns:number; rows:number; confidence:string } {
  const common = [8,16,24,32,48,64,96,128,256];
  const square = common.filter(size => width%size===0 && height%size===0 && width/size*height/size>=2 && width/size*height/size<=64);
  if (square.length) {
    const preferred = square.sort((a,b) => Math.abs(width/a*height/a-16)-Math.abs(width/b*height/b-16))[0];
    return { columns:width/preferred, rows:height/preferred, confidence:`Suggested ${preferred}×${preferred}px square cells.` };
  }
  const counts = [16,12,10,8,6,4,3,2];
  for (const count of counts) if (width%count===0 && width/count<=height) return { columns:count, rows:1, confidence:'Suggested a horizontal strip; check the preview.' };
  return { columns:1,rows:1,confidence:'No regular grid found. Set columns and rows manually.' };
}
