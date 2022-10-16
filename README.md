# Prepare SF Symbols 4 for **HA Custom Symbols**

## Requirements

- [SF Symbols App](https://developer.apple.com/sf-symbols/)
- [Node.js](https://nodejs.org/en/)
- [Inkscape](https://inkscape.org) (optional)

## Installation

1. Clone or download this repository
2. run `npm install`

## Create custom symbols

Follow the [instructions](https://developer.apple.com/documentation/uikit/uiimage/creating_custom_symbol_images_for_your_app/) from Apple

## Create svg files

1. export required symbols from **SF Symbols App** as version 4+
2. run `node prepare.js path/to/svg-folder`  
   creates a result folder in your working directory
3. run `node test/server.js` and inspect symbols in a webbrowser
4. (optional) optimize symbols with Inkscape

For all script arguments run `node prepare.js --help`

## Optimize svg file

1. open svg in **Inkscape**
2. duplicate both overlapping files
3. path > difference
4. save a copy
5. past only new created path to existing svg
6. delete attribute id and keep only hierarchical (primary) class on new path. Eg.
   ```xml
   <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="7.79 -90 108 108">
     <path class="monochrome-0 multicolor-0:indigo" fill="#5856d6" d="m 9 ..."/>
     <path class="monochrome-1#clear multicolor-1:gray#clear hierarchical-1:secondary#clear"    fill="#8e8e93" d="m 10 ..."/>
     <path class="hierarchical-0:primary" d="M 22 ..."/>
   </svg>
   ```

Kown issues in SF Symbols Beta 4:

- camera.filters
- chart.line.downtrend.xyaxis
- chart.line.flattrend.xyaxis
- chart.line.uptrend.xyaxis
- chart.xyaxis.line
- distribute.horizontal.center
- distribute.horizontal.center.fill
- distribute.vertical.center
- distribute.vertical.center.fill
- facemask
- facemask.fill
- stethoscope
- thermometer.sun

## Limitations

- SF Symbols width is variable.
  The script fit them into a square.
- Please check copyright of used symbols.
