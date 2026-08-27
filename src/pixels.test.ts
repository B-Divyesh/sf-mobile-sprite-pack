import { beforeAll, describe, expect, it } from 'vitest';
import { findOpaqueBounds, hexToRgb, parseCustomPalette, sliceGrid, suggestGrid, transformPixels, type PixelFrame, validateGrid } from './pixels';
import { createZip } from './zip';

beforeAll(()=>{
  if(!globalThis.ImageData){
    class TestImageData { data:Uint8ClampedArray;width:number;height:number;constructor(dataOrWidth:Uint8ClampedArray|number,widthOrHeight:number,height?:number){if(typeof dataOrWidth==='number'){this.width=dataOrWidth;this.height=widthOrHeight;this.data=new Uint8ClampedArray(this.width*this.height*4)}else{this.data=dataOrWidth;this.width=widthOrHeight;this.height=height!}} }
    Object.assign(globalThis,{ImageData:TestImageData});
  }
});

describe('pixel transforms',()=>{
  it('parses only complete six-digit palette colors',()=>{
    expect(hexToRgb('#f4b942')).toEqual([244,185,66]);
    expect(parseCustomPalette('#000000, nope #ffffff')).toEqual([[0,0,0],[255,255,255]]);
  });

  it('finds opaque content and trims without mutating the source',()=>{
    const data=new Uint8ClampedArray(3*3*4);data.set([250,10,10,255],(1*3+1)*4);
    expect(findOpaqueBounds(data,3,3)).toMatchObject({left:1,top:1,width:1,height:1});
    const source=new ImageData(data,3,3);const result=transformPixels(source,{trim:true,padding:1,palette:'original',dither:'none',customPalette:''});
    expect([result.width,result.height]).toEqual([3,3]);expect(result.data[(1*3+1)*4]).toBe(250);expect(source.data[0]).toBe(0);
  });

  it('suggests a sixteen-frame grid for a common 128 by 128 sheet',()=>{
    expect(suggestGrid(128,128)).toMatchObject({columns:4,rows:4});
  });

  it('rejects lossy, fractional, and out-of-range grids before slicing',()=>{
    const source:PixelFrame={data:new ImageData(64,64),duration:100,name:'sheet'};
    expect(()=>validateGrid(64,64,3,3)).toThrow(/must divide evenly/i);
    expect(()=>validateGrid(64,64,1.5,1)).toThrow(/whole number/i);
    expect(()=>sliceGrid(source,100,1)).toThrow(/Columns must be a whole number from 1 to 64/i);
    expect(sliceGrid(source,4,4)).toHaveLength(16);
  });
});

describe('ZIP export',()=>{
  it('writes a valid local header and end record',async()=>{
    const bytes=new Uint8Array(await createZip([{name:'atlas.json',data:new TextEncoder().encode('{}')}]).arrayBuffer());
    expect(Array.from(bytes.slice(0,4))).toEqual([0x50,0x4b,0x03,0x04]);
    expect(Array.from(bytes.slice(-22,-18))).toEqual([0x50,0x4b,0x05,0x06]);
  });
});
