// app state
const STATE = {
    HOVER_RADIUS: 10,
    POINT_RADIUS: 5,

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

    const coord = [e.clientX, e.clientY],
          points = [...this.points, ...this.anchors],
          existsPoint = _pointFromCoord(points, coord, this.HOVER_RADIUS)

    if(existsPoint){
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
}

const _onContext = function(e){
    e.preventDefault()

    const coord = [e.clientX, e.clientY],
          point = _pointFromCoord(this.points, coord, this.HOVER_RADIUS)

    if(!point){
        return
    }

    let lines = this.lines

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
    const coord = [e.clientX, e.clientY],
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

const _drawCurve = (ctx, line) => {
    ctx.beginPath()
    ctx.strokeStyle = "#991";
    ctx.lineWidth = 4
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
        'Mouse: left - create, right - delete',
        padding,
        padding, 
        state.width - padding * 2
    )
    ctx.fill()
    ctx.closePath()
}

const _drawGrid = (state) => {
    const ctx = state.ctx,
          size = state.HOVER_RADIUS

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
        _drawCurve(ctx, line)
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
              if(state.dragged){
                  state.dragged[0] = e.clientX
                  state.dragged[1] = e.clientY
              }
          },
          onDragStart = (e) => {
            const point = [e.clientX, e.clientY],
            coords = [...state.points, ...state.anchors]
      
            coords.forEach(c => {
                if(_inRange(c, point, state.HOVER_RADIUS)){
                    state.dragged = c
                }
            })

            canvas.addEventListener('mousemove', onDrag)
        }
        
    canvas.addEventListener('contextmenu', _onContext.bind(state))
    canvas.addEventListener('click', _onClick.bind(state))
    canvas.addEventListener('mousemove', _onHover.bind(state))

    canvas.addEventListener('mousedown', onDragStart)
    canvas.addEventListener('mouseup', (e) => {
        canvas.removeEventListener('mousemove', onDrag)
        state.dragged = null
    })
}

const run = (state) => {

    const canvas = document.createElement('canvas'),
          root = document.querySelector('#app'),
          styles = window.getComputedStyle(root),
          width = parseFloat(styles.width),
          height = parseFloat(styles.height)

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