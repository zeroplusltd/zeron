// ===== Helpers =====
function resolvePath(path, scope){
    return path.split('.').reduce((o,k)=>o?.[k], scope);
}

function parseTemplate(template){
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<wrapper>${template}</wrapper>`,'text/html');
    const wrapper = doc.body.firstChild;

    function walk(node){
        if(node.nodeType===Node.TEXT_NODE) return {type:'text',content:node.textContent};
        if(node.nodeType===Node.ELEMENT_NODE && node.tagName.toLowerCase()==='for'){
            const path = node.getAttribute('each');
            const as = node.getAttribute('as')||'item';
            const idx = node.getAttribute('index')||'i';
            const children = [];
            node.childNodes.forEach(c=>children.push(walk(c)));
            return {type:'for',path,as,index:idx,children};
        }
        const children = [];
        node.childNodes.forEach(c=>children.push(walk(c)));
        return {type:'element',tag:node.tagName.toLowerCase(),attrs:[...node.attributes].reduce((a,c)=>({...a,[c.name]:c.value}),{}),children};
    }

    return [...wrapper.childNodes].map(n=>walk(n));
}

function renderNodes(nodes, scope){
    let html='';
    nodes.forEach(node=>{
        if(node.type==='text'){
            html += node.content.replace(/{{\s*([^}]+)\s*}}/g, (_,key)=>{
                if(key==='.') return scope.item??'';
                return resolvePath(key, scope)??'';
            });
        } else if(node.type==='element'){
            const attrs = Object.entries(node.attrs).map(([k,v])=>`${k}="${v}"`).join(' ');
            html += `<${node.tag}${attrs? ' '+attrs:''}>${renderNodes(node.children,scope)}</${node.tag}>`;
        } else if(node.type==='for'){
            const list = resolvePath(node.path, scope);
            if(Array.isArray(list)){
                list.forEach((val,i)=>{
                    const newScope={...scope};
                    newScope[node.as]=val;
                    newScope[node.index]=i;
                    newScope.item=val;
                    html += renderNodes(node.children,newScope);
                });
            }
        }
    });
    return html;
}

function inject(parent, marker, html){
    const temp=document.createElement('div');
    temp.innerHTML=html;
    const nodes=[...temp.childNodes];
    nodes.forEach(n=>parent.insertBefore(n, marker));
    return nodes;
}

function findMarker(text){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_COMMENT);
    while(walker.nextNode()) if(walker.currentNode.nodeValue===text) return walker.currentNode;
    return null;
}

// ===== Events =====
const handlers={
    addToCart:(product,e,el)=>alert(`Added ${product.name}!`)
};

//NEW start
function onEffect(fnName, params){
    loadData(fnName, params);
}

function handleMarker(template, id) {
    // 1️⃣ find start comment node
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_COMMENT
    );

    let startNode = null;
    let endNode = null;
    const startMarker = `oneffect:${id}`;
    const endMarker = `/oneffect:${id}`;

    while (walker.nextNode()) {
        const n = walker.currentNode;
        const val = n.nodeValue.trim();
        if(val === startMarker) startNode = n;
        if(val === endMarker) endNode = n;
        if(startNode && endNode) break;
    }

    if(!startNode || !endNode) return; // marker missing

    // 2️⃣ remove old content between start & end
    let n = startNode.nextSibling;
    while (n && n !== endNode) {
        const next = n.nextSibling;
        n.remove();
        n = next;
    }

    // 3️⃣ insert new HTML
    const frag = document.createRange().createContextualFragment(template);
    endNode.parentNode.insertBefore(frag, endNode);
}
function normalizeParams(params, effect) {
    if (Array.isArray(params)) {
        return params;
    }

    if (params && typeof params === 'object') {
        return [params]; // wrap single object
    }

    if (effect) {
        return [effect];
    }

    return [];
}

//NEW end

// ===== Main Renderer =====
const loadData = async (fnName=null, params=null)=>{
   
    try {
        let response = await fetch(location.pathname, {
            method: "POST",
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ __zeron_php: '1'})
        });
        let data = await response.json();

        const effects = data.data||{};
       
        
    
   await Promise.all(Object.keys(effects).map(async id => {
        const effect = effects[id];
        if(fnName && fnName != effect.fn) return;

        if(!fnName){
            handleMarker(effect.loading, id);
        }
        

        // Fetch data from session
        let cFunc;
       
        if(fnName){
            cFunc = fnName;
        }else{
            cFunc = effect.fn;
        }

       const cParams = normalizeParams(params, effect.body);

        //  console.log(cParams);
        const res = await fetch(location.pathname, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body:JSON.stringify({function:cFunc, params: cParams, __zeron_php: '2', id: id})
        });
        const dataFunc = await res.json();
        

        // Remove loading
        // loadingNodes.forEach(n=>n.remove());

        if(!dataFunc || Object.keys(dataFunc).length===0){
            if(effect.empty) handleMarker(effect.empty, id); // inject(parent,marker,effect.empty);
            // marker.remove();
            return;
        }

        // Render
        const nodes = parseTemplate(effect.template);
        const html = renderNodes(nodes, dataFunc);
        // inject(parent,marker,html);
        handleMarker(html, id);
        // marker.remove();

        //success
        if(effect.success.navLink){
            navigationLink(effect.success.navLink);
        }

       
    }));


    } catch (e) {
            // boxid.innerHTM = "<p>Fetch error</p>";
            // console.log(e.message);
    } finally {
        bindClicks();
    }
};

async function loadMetaData(){
try{
        const res=await fetch(location.pathname,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({function:"getPageMeta", params:"", __zeron_php: '3'})
        });
        const data=await res.json();
        if (data.title) document.title = data.title;
    }catch(e){

    }
}

function startProgress() {
    const bar = document.getElementById("progress-bar");
    bar.style.width = "0%";
    bar.style.display = "block";
    let width = 0;
    window.progressInterval = setInterval(() => {
        if (width < 90) { width += Math.random() * 10; bar.style.width = width + "%"; }
    }, 200);
}

function finishProgress() {
    const bar = document.getElementById("progress-bar");
    bar.style.width = "100%";
    clearInterval(window.progressInterval);
    setTimeout(() => { bar.style.display = "none"; }, 200);
    loadData();
    loadMetaData();
}
document.addEventListener("DOMContentLoaded", async ()=>{
    loadData();
});




function navigationLink(link, fromPop = false){
  startProgress();

  fetch(link, {
    method: 'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ __zeron_navlink: '1' }),
    credentials: 'same-origin',
    redirect: 'follow',
    cache: 'no-store'
  })
  .then(async (res) => {
    const html = await res.text();
    document.getElementById("main-content").innerHTML = html;

    const finalUrl = res.url || link;

    // ✅ ONLY user click updates history
    if (!fromPop) {
      const u = new URL(finalUrl, location.origin);
      history.pushState(null, "", u.pathname + u.search + u.hash);
    }
  })
  .finally(() => finishProgress());
}

// ✅ browser back / forward
window.addEventListener("popstate", () => {
  navigationLink(
    location.pathname + location.search + location.hash,
    true // 👈 important
  );
});



// usage in fetch
document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;

    e.preventDefault();

    const pageLink = link.getAttribute("href");

    navigationLink(pageLink);
});



function bindClicks(){
    document.querySelectorAll('[\\onclick]').forEach(el=>{
        const value=el.getAttribute('onclick');
        el.removeAttribute('onclick');

        const match=value.match(/^(\w+)\((.*)\)$/);
        if(!match) return;

        const fnName=match[1], argStr=match[2];

        el.addEventListener('click',e=>{
            
            const args=parseArgs(argStr);
            args.push({eventType:e.type, element:el.id||null});
            // console.log(argStr);

            if(fnName === "state"){
                const args2 = argStr.trim() ? parseStateArgs(argStr) : [];

                Actions.state?.(...args2);
            }else{
                callPHPFunction(fnName, args, value, el);
            }
            
        });
    });
}


/* ---------- STATE ---------- */
const state = new Proxy({}, {
    set(obj, key, val) {
        obj[key] = val;
        render();
        //.then(() => bindClicks())
        return true;
    }
});

function parseStateArgs(str) {
    if (!str.trim()) return [];
    return str.split(',').map(s => {
        s = s.trim();

        if (s === '!') return '!';             // toggle token
        if (s === 'true') return true;
        if (s === 'false') return false;
        if (!isNaN(s)) return Number(s);

        // string
        return s.replace(/^['"]|['"]$/g, '');
    });
}

/* ---------- FIND EFFECT MARKERS ---------- */
function getEffectMarkers() {
    const list = [];
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_COMMENT
    );

    while (walker.nextNode()) {
        const v = walker.currentNode.nodeValue;
        if (v.startsWith('fx:')) list.push([v.slice(3), walker.currentNode]);
    }
    return list;
}

/* ---------- FIND END COMMENT ---------- */
function findEndComment(start, id) {
    let n = start.nextSibling;
    while (n) {
        if (n.nodeType === 8 && n.nodeValue === `/fx:${id}`) return n;
        n = n.nextSibling;
    }
    return null;
}

/* ---------- RENDER ---------- */
async function render() {
    const payload = {
    ...state,        // Proxy এর ভিতরের data
    __zeron_php_fx: '1'
};
    const res = await fetch(location.pathname, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });

    const html = await res.json();
    const markers = getEffectMarkers();

    for (const [id, start] of markers) {
        const end = findEndComment(start, id);
        if (!end) continue;

        // remove old content between comments
        let n = start.nextSibling;
        while (n && n !== end) {
            const next = n.nextSibling;
            n.remove();
            n = next;
        }

        // insert new HTML
        const frag = document.createRange().createContextualFragment(html[id]);
        end.parentNode.insertBefore(frag, end);
    }
    bindClicks();
}

/* ---------- CENTRAL ACTIONS ---------- */
const Actions = {
    toggle() {
        state.show = !state.show;
    },
    add() {
        state.items = [...(state.items || []), 'Item ' + Date.now()];
    },
    // 🔥 STATE FUNCTION
    state(key, value) {
        if (value === '!') {            // toggle token
            state[key] = !state[key];
            return;
        }
        if (value === undefined) {      // state('show') auto toggle
            state[key] = !state[key];
            return;
        }
        state[key] = value;             // set value
    }
};

/* ---------- INITIAL STATE ---------- */
state.price = 300;
state.show = false;
state.items = [];

/* ---------- INITIAL RENDER ---------- */
render();
// .then(() => bindClicks())



function parseArgs(argStr) {
    if (!argStr.trim()) return [];
    const args = [];
    let current = '', depth = 0, inString = false, quote = '';

    for (let i = 0; i < argStr.length; i++) {
        const c = argStr[i];
        if (inString) { current += c; if(c === quote && argStr[i-1]!=='\\') inString=false; continue; }
        if (c === '"' || c === "'") { inString=true; quote=c; current+=c; continue; }
        if (c==='{'||c==='[') depth++; if(c==='}'||c===']') depth--;
        if(c===','&&depth===0){ args.push(current.trim()); current=''; continue; }
        current+=c;
    }
    if(current.trim()) args.push(current.trim());
    return args.map(parseValue);
}

function parseValue(v){
    if(v==='null') return null;
    if(v==='true') return true;
    if(v==='false') return false;
    if(!isNaN(v)) return Number(v);
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) return v.slice(1,-1);
    if(v.startsWith('{')||v.startsWith('[')){
        try{
            // JS object/array → valid JSON → JS object
            const json = v.replace(/'/g,'"').replace(/(\w+)\s*:/g,'"$1":');
            return JSON.parse(json);
        }catch{
            return null;
        }
    }
    return v;
}

/* -------------------------------
   AJAX call to PHP
-------------------------------- */
async function callPHPFunction(functionName, params, originalFun, elem){
    try{
        const res=await fetch(location.pathname,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({function:functionName, params:params, __zeron_php: '3'})
        });
        const data=await res.json();
        
        if(!data.success) {
            // alert("Error: "+data.message)
            try {
                eval(originalFun);
            } catch (e) {
                console.error("Eval Error:", e.message);
            }
        }else{
            
            // Bind {{message}} inside elements with data-bind
            document.querySelectorAll('[data-bind]').forEach(el => {
                const key = el.getAttribute('data-bind');
                if (data[key] !== undefined) el.textContent = data[key];
            });


            dataBindCondition(data);

            if(data["data-link"]){
                navigationLink(data["data-link"]);
            }


            console.log("PHP response:",data);
        }
        return data;
    }catch(err){
        //  console.error("AJAX Error:",err); alert("AJAX Error: "+err.message);
         }
}


function dataBindCondition(data){
    document.querySelectorAll('if[data-con]').forEach(el => {
        const key = el.getAttribute('data-con');
        if (!data[key]) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });
}
dataBindCondition({});
