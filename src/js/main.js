// app state
const STATE = {
    UNIT: 0,
    CELL: 0,
    LINE_WIDTH: 0,
    HOVER_RADIUS: 0,
    POINT_RADIUS: 0,
    PADDING: 0,

    canvas: null,
    root: null,
    ctx: null,

    anchors: [],
    points: [],
    lines: [],

    hovered: null,
    dragged: null,

    x: 0,
    y: 0,
    width: 0,
    height: 0,
}


const _getCanvasPoint = (e) => {
    let x, y
    
    if(e.type === 'touchstart' || e.type === 'touchend' || e.type === 'touchmove'){
        x = Math.round(e.changedTouches[0].pageX)
        y = Math.round(e.changedTouches[0].pageY)
    } else {
        x = e.pageX
        y = e.pageY
    }
    return [x, y]
}

const _equalsCoors = (p1, p2) => p1[0] === p2[0] && p1[1] === p2[1]

// попадение точки point в диапазон range
const _inRange = (point, center, radius) => {
    return (point[0] > center[0] - radius) 
        && (point[0] < center[0] + radius)
        && (point[1] > center[1] - radius)
        && (point[1] < center[1] + radius)
}

// начальные координаты доп. точек (якорей)
const _calcHelperCenter = (from, to, factor) => {
    return [
        from[0] - Math.round((from[0] - to[0]) * factor),
        from[1] - Math.round((from[1] - to[1]) * factor),
    ]
}

// поиск в списке точек points той, в радиус вокруг которой попадает координата
const _pointFromCoord = (points, coord, radius) => {
    for(let i = 0, len = points.length; i < len; i += 1){
        if(_inRange(coord, points[i], radius)){
            return points[i]
        }
    }

    return null
}


const _onClick = function(e) {
    const coord = _getCanvasPoint(e),
          points = [...this.points, ...this.anchors],
          existsPoint = _pointFromCoord(points, coord, this.HOVER_RADIUS)

    if(existsPoint){
        return    
    }

    if(
          (coord[0] < this.PADDING) 
       || (coord[0] > this.width - this.PADDING) 
       || (coord[1] < this.PADDING) 
       || (coord[1] > this.height - this.PADDING)
     ){
        this.dragged = null
        this.hovered = null
        return
      }

    if(this.points.length){
        const prevP = this.points[this.points.length - 1],
              line = {
                  from: prevP,
                  to: coord,
                  cp1: _calcHelperCenter(prevP, coord, 0.25),
                  cp2: _calcHelperCenter(prevP, coord, 0.75),
              }

        this.anchors.push(line.cp1)
        this.anchors.push(line.cp2)
        this.lines.push(line)
    }
    this.points.push(coord)
    this.hovered = coord
}

const _onContext = function(e){
    e.preventDefault()

    const coord = [e.clientX, e.clientY],
          point = _pointFromCoord(this.points, coord, this.HOVER_RADIUS)

    if(!point){
        return
    }

    this.hovered = null

    let lines = this.lines

    // одна точка
    if(!lines.length){
        this.points.length = 0
        return
    }

    for(let i = 0, len = lines.length; i < len; i += 1){
        let line = lines[i]

        if(_equalsCoors(line.from, point) || _equalsCoors(line.to, point)){
            let dPoints = [],
                dAnchors = []

            if(_equalsCoors(line.to, point)){
                // последняя точка
                if((i + 1) === len){
                    dPoints.push(point)
                    dAnchors.push(line.cp1)
                    dAnchors.push(line.cp2)
                    delete lines[i]
                } else {
                    const nextLine = lines[i + 1]
                    dPoints.push(point)
                    dAnchors.push(line.cp2)
                    dAnchors.push(nextLine.cp1)
                    line.to = nextLine.to
                    line.cp2 = nextLine.cp2
                    delete lines[i + 1]
                }
            } else {
                // первая точка
                if(i === 0){
                    dPoints.push(point)
                    dAnchors.push(line.cp1)
                    dAnchors.push(line.cp2)
                    delete lines[i]
                }
            }

            let d
            while(d = dPoints.pop()){
                for(let j = 0; j < this.points.length; j += 1){
                    if(_equalsCoors(d, this.points[j])){
                        delete this.points[j]
                        break;
                    }
                }
            }
            this.points = this.points.filter(p => !!p)

            while(d = dAnchors.pop()){
                for(let j = 0; j < this.anchors.length; j += 1){
                    if(_equalsCoors(d, this.anchors[j])){
                        delete this.anchors[j]
                        break;
                    }
                }
            }
            this.anchors = this.anchors.filter(p => !!p)
            break;
        } 
    }

    this.lines = lines.filter(l => !!l)
}

const _onHover = function(e){
    const coord = _getCanvasPoint(e),
          points = [...this.points, ...this.anchors]
          
    this.hovered = _pointFromCoord(points, coord, this.HOVER_RADIUS)
}


const _clear = (ctx, size) => {
    ctx.beginPath()
    ctx.fillStyle = '#666'
    ctx.fillRect(...size)
    ctx.fill()
    ctx.closePath()
}

const _drawCurve = (ctx, line, width) => {
    ctx.beginPath()
    ctx.strokeStyle = "#991";
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.moveTo(...line.from)
    ctx.bezierCurveTo(...line.cp1, ...line.cp2, ...line.to)
    ctx.stroke()
    ctx.closePath()
}

const _drawHelpersLines = (ctx, line) => {
    ctx.beginPath()
    ctx.strokeStyle = "#444"
    ctx.lineWidth = 1
    ctx.moveTo(...line.from)
    ctx.lineTo(...line.cp1)
    ctx.moveTo(...line.to)
    ctx.lineTo(...line.cp2)
    ctx.stroke()
    ctx.closePath()
}

const _drawPoint = (ctx, center, radius) => {
    ctx.beginPath()
    ctx.fillStyle = '#ee4'
    ctx.arc(...center, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()
}

const _drawAnchor = (ctx, center, radius) => {
    ctx.beginPath()
    ctx.fillStyle = '#ccc'
    ctx.arc(...center, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()
}

const _drawHoverArc = (ctx, center, radius) => {
    ctx.beginPath()
    ctx.fillStyle = "#888"
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ccc'
    ctx.arc(...center, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
}

const _drawText = (state) => {
    const ctx = state.ctx,
          padding = Math.floor(state.width * 0.01)

    ctx.beginPath()
    ctx.font = 'bold 18px Montserrat, sans-serif'
    ctx.fillStyle = '#ddd'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(
        'Click - add, right click or long touch - remove',
        padding,
        padding, 
        state.width - padding * 2
    )
    ctx.fill()
    ctx.closePath()
}

const _drawGrid = (state) => {
    const ctx = state.ctx,
          size = state.CELL

    ctx.beginPath()
    ctx.lineWidth = 1
    ctx.strokeStyle = "#555"
    for(let r = size; r < state.height; r += size){
        ctx.moveTo(0, r)
        ctx.lineTo(state.width, r)
    }

    for(let c = size; c < state.width; c += size){
        ctx.moveTo(c, 0)
        ctx.lineTo(c, state.height)
    }
    ctx.stroke()
    ctx.closePath()
}

const _draw = (state) => {
    const ctx = state.ctx

    _clear(ctx, [state.x, state.y, state.width, state.height])
    _drawGrid(state)
    
    state.lines.forEach(line => {
        _drawHelpersLines(ctx, line)
        _drawCurve(ctx, line, state.LINE_WIDTH)
    })


    if(state.hovered){
        _drawHoverArc(ctx, state.hovered, state.HOVER_RADIUS)
    }

    state.anchors.forEach(coord => _drawAnchor(ctx, coord, state.POINT_RADIUS))
    state.points.forEach(coord => _drawPoint(ctx, coord, state.POINT_RADIUS))
    _drawText(state)
}


const _frame = function(state){
    _draw(state)
    requestAnimationFrame(() => _frame(state))
}


const _attachEvents = (state) => {
    const canvas = state.canvas,
          onDrag = (e) => {
              const coord = _getCanvasPoint(e)

              if(
                  (coord[0] < state.PADDING) 
               || (coord[0] > state.width - state.PADDING) 
               || (coord[1] < state.PADDING) 
               || (coord[1] > state.height - state.PADDING)
            ){
              state.dragged = null
              state.hovered = null
            }

              if(state.dragged){
                  state.dragged[0] = coord[0]
                  state.dragged[1] = coord[1]
              }
          },
          onDragStart = (e) => {
            const point = _getCanvasPoint(e),
            coords = [...state.points, ...state.anchors]
      
            coords.forEach(c => {
                if(_inRange(c, point, state.HOVER_RADIUS)){
                    state.dragged = c
                }
            })

            canvas.addEventListener('mousemove', onDrag)
            canvas.addEventListener('touchmove', onDrag)
        }
        
    canvas.addEventListener('mouseleave', (e) => { 
        state.dragged = null
        state.hovered = null
    })
    canvas.addEventListener('contextmenu', _onContext.bind(state))
    canvas.addEventListener('click', _onClick.bind(state))
    canvas.addEventListener('mousemove', _onHover.bind(state))

    canvas.addEventListener('mousedown', onDragStart)
    canvas.addEventListener('mouseup', (e) => {
        canvas.removeEventListener('mousemove', onDrag)
        state.dragged = null
    })
    // Mobile
    canvas.addEventListener('touchstart', (e) => {
        (_onHover.bind(state))(e)
        onDragStart(e)
    })
    canvas.addEventListener('touchend', (e) => {
        canvas.removeEventListener('mousemove', onDrag)
        canvas.removeEventListener('touchmove', onDrag)
        state.hovered = null
        state.dragged = null
    })
    // фиксация холста на mobile
    canvas.addEventListener('touchmove', (e) => e.preventDefault())
    canvas.addEventListener('touchcancel', (e) => e.preventDefault())
}

const run = (state) => {

    const canvas = document.createElement('canvas'),
          root = document.querySelector('#app'),
          styles = window.getComputedStyle(root),
          width = parseFloat(styles.width),
          height = parseFloat(styles.height),
          unit = Math.max(6, Math.round(Math.min(width, height) * 0.01))

    state.CELL = unit * 2
    state.POINT_RADIUS = unit
    state.PADDING = unit * 2
    state.HOVER_RADIUS = unit * 2
    state.LINE_WIDTH = Math.floor(unit * 0.75)

    canvas.width = width
    canvas.height = height

    state.canvas = canvas
    state.ctx = canvas.getContext('2d')
    state.width = width
    state.height = height
    
    root.appendChild(canvas)

    _attachEvents(state)
    requestAnimationFrame(() => _frame(state))
}

run(STATE)