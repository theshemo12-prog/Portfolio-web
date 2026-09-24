const {useEffect, useMemo, useState} = React;
const starter = [
  {id:1,title:"Sketch the onboarding flow",project:"Website refresh",priority:"high",due:"Today",done:false},
  {id:2,title:"Reply to client feedback",project:"Client work",priority:"medium",due:"Today",done:false},
  {id:3,title:"Read 20 pages of Atomic Habits",project:"Personal",priority:"low",due:"Tomorrow",done:true},
  {id:4,title:"Plan next week’s sprint",project:"Work",priority:"medium",due:"Fri, Sep 26",done:false},
  {id:5,title:"Book dentist appointment",project:"Personal",priority:"low",due:"Mon, Sep 29",done:false}
];
const icons = {inbox:"⌂", today:"◷", upcoming:"□", completed:"✓"};

function App(){
  const [tasks,setTasks] = useState(()=>JSON.parse(localStorage.getItem("flowlist-tasks")||"null")||starter);
  const [view,setView] = useState("today"), [showModal,setShowModal] = useState(false);
  const [aiBusy,setAiBusy] = useState(false), [aiMessage,setAiMessage] = useState("");
  const [assistantOpen,setAssistantOpen] = useState(false), [chat,setChat] = useState([]);
  const [searchOpen,setSearchOpen] = useState(false), [search,setSearch] = useState("");
  const [notice,setNotice] = useState(false), [dark,setDark] = useState(false);
  useEffect(()=>localStorage.setItem("flowlist-tasks",JSON.stringify(tasks)),[tasks]);
  useEffect(()=>{document.body.classList.toggle("dark",dark)},[dark]);
  const completed = tasks.filter(t=>t.done).length;
  const visible = useMemo(()=>{
    let list = view==="inbox" ? tasks.filter(t=>!t.done) : view==="completed" ? tasks.filter(t=>t.done) : view==="upcoming" ? tasks.filter(t=>t.due!=="Today"&&!t.done) : tasks.filter(t=>t.due==="Today"&&!t.done);
    return search ? list.filter(t=>`${t.title} ${t.project}`.toLowerCase().includes(search.toLowerCase())) : list;
  },[tasks,view,search]);
  function toggle(id){setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t))}
  function addTask(task){setTasks(ts=>[{...task,id:Date.now(),done:false},...ts]);setShowModal(false)}
  function remove(id){setTasks(ts=>ts.filter(t=>t.id!==id))}
  async function askAI(){
    setAiBusy(true); setAiMessage("");
    try {const response=await fetch("/api/ai/prioritize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tasks})});if(!response.ok)throw new Error();setAiMessage((await response.json()).message)}
    catch {const next=tasks.find(t=>!t.done);setAiMessage(next?`Start with “${next.title}”. It is your best next step because it is ${next.priority} priority and due ${next.due.toLowerCase()}.`:"You’re all caught up — enjoy the breathing room.")}
    finally{setAiBusy(false)}
  }
  async function sendAssistant(message){
    if(!message.trim() || aiBusy) return;
    const userMessage=message.trim();
    setChat(messages=>[...messages,{role:"user",text:userMessage}]);
    setAiBusy(true);
    try {
      const response=await fetch("/api/ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMessage,tasks})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Assistant request failed");
      setChat(messages=>[...messages,{role:"assistant",text:data.message}]);
    } catch(error) {
      setChat(messages=>[...messages,{role:"assistant",text:"I could not reach the AI service. Start the Python server and check GITHUB_TOKEN."}]);
    } finally {setAiBusy(false)}
  }
  const nav = key=><Nav icon={key} label={key[0].toUpperCase()+key.slice(1)} active={view===key} onClick={()=>{setView(key);setAiMessage("")}}/>;
  return <div className="shell">
    <aside className="rail"><div className="brand"><span className="brand-mark">f</span><span>flowlist</span></div>
      {nav("inbox")}{nav("today")}{nav("upcoming")}{nav("completed")}
      <div className="workspace">Projects</div><div className="project"><i className="dot"></i><span>Website refresh</span></div><div className="project"><i className="dot lav"></i><span>Personal</span></div>
      <button className={`profile ${view==="profile"?"profile-active":""}`} onClick={()=>setView("profile")}><div className="avatar">OS</div><div><b>Omesh Shemo</b><small>Free workspace</small></div></button>
    </aside>
    <main className="main">
      <header className="topbar"><span className="date">THURSDAY · SEP 24, 2026</span><div className="top-actions">
        <button className="icon-btn" aria-label="Search" onClick={()=>setSearchOpen(v=>!v)}>⌕</button><button className={`icon-btn ${notice?"has-notice":""}`} aria-label="Notifications" onClick={()=>setNotice(v=>!v)}>♧</button><button className="avatar small" onClick={()=>setView("profile")}>OS</button>
        {searchOpen&&<input className="search-box" autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks..." />}
        {notice&&<div className="notice-pop"><b>All caught up</b><span>No new notifications</span></div>}
      </div></header>
      {view==="profile"?<Profile tasks={tasks} dark={dark} setDark={setDark}/>:<><section className="hero"><div>
        <p className="eyebrow">{view==="inbox"?"Everything in one place":view==="completed"?"A record of your progress":view==="upcoming"?"Plan ahead with calm":"Good morning, Omesh"}</p>
        <h1>{view==="inbox"?"Your inbox.":view==="completed"?"Done is a feeling.":view==="upcoming"?"Look a little ahead.":<>Make space for<br/><span>what matters.</span></>}</h1>
        <div className="stats"><div className="stat"><strong>{tasks.filter(t=>!t.done).length}</strong><span>open tasks</span></div><div className="stat"><strong>{completed}</strong><span>completed</span></div><div className="stat"><strong>82%</strong><span>focus score</span></div></div>
      </div><div><button className="ai-btn" onClick={askAI} disabled={aiBusy}><b>✦</b>{aiBusy?"Thinking…":"Ask Flow AI"}</button>{aiMessage&&<div className="ai-note"><strong>Flow AI says</strong>{aiMessage}</div>}</div></section>
      <div className="toolbar"><div className="tabs"><button className={`tab ${view==="today"?"active":""}`} onClick={()=>setView("today")}>Today</button><button className={`tab ${view==="upcoming"?"active":""}`} onClick={()=>setView("upcoming")}>Upcoming</button><button className={`tab ${view==="completed"?"active":""}`} onClick={()=>setView("completed")}>Completed</button></div><button className="new-task" onClick={()=>setShowModal(true)}>＋ New task</button></div>
      <div className="task-list">{visible.length?visible.map(t=><Task key={t.id} task={t} toggle={toggle} remove={remove}/>):<div className="empty">Nothing here yet. A clear list is a lovely thing.</div>}</div></>}
    </main><button className="assistant-fab" onClick={()=>setAssistantOpen(true)} aria-label="Open Flow AI assistant">✦</button>
    {assistantOpen&&<Assistant chat={chat} busy={aiBusy} onClose={()=>setAssistantOpen(false)} onSend={sendAssistant}/>}
    {showModal&&<TaskModal onClose={()=>setShowModal(false)} onSave={addTask}/>}
  </div>
}
function Nav({icon,label,active,onClick}){return <button className={`nav-link ${active?"active":""}`} onClick={onClick}><span className="nav-icon">{icons[icon]}</span><span>{label}</span></button>}
function Task({task,toggle,remove}){return <div className={`task ${task.done?"done":""}`}><button className={`check ${task.done?"done":""}`} onClick={()=>toggle(task.id)} aria-label={`Mark ${task.title} ${task.done?"open":"done"}`}>{task.done?"✓":""}</button><div><p className="task-title">{task.title}</p><div className="task-meta"><span>{task.project}</span><span className={`badge ${task.priority}`}>{task.priority}</span></div></div><div className="task-actions"><span className="due">{task.due}</span><button className="delete" onClick={()=>remove(task.id)} aria-label="Delete task">×</button></div></div>}
function Profile({tasks,dark,setDark}){const [name,setName]=useState("Omesh Shemo"),[saved,setSaved]=useState(false),[photo,setPhoto]=useState(false);return <section className="profile-page"><p className="eyebrow">Workspace settings</p><h1>Your profile.</h1><p className="profile-lead">Shape Flowlist around the way you like to work.</p><div className="profile-card"><div className="profile-cover"><div className="avatar profile-avatar">OS</div><button className="cover-button" onClick={()=>setPhoto(true)}>{photo?"Photo updated ✓":"Change photo"}</button></div><div className="profile-fields"><label>Display name<input value={name} onChange={e=>{setName(e.target.value);setSaved(false)}}/></label><label>Email address<input value="omesh@example.com" readOnly/></label><div className="setting-row"><div><b>Dark mode</b><small>Use a softer interface in low light.</small></div><button className={`switch ${dark?"on":""}`} onClick={()=>setDark(v=>!v)} aria-label="Toggle dark mode"><span></span></button></div><div className="setting-row"><div><b>Tasks completed</b><small>{tasks.filter(t=>t.done).length} wins in this workspace.</small></div><span className="profile-stat">✦</span></div><button className="save-btn" onClick={()=>setSaved(true)}>{saved?"Saved ✓":"Save changes"}</button></div></div></section>}
function Assistant({chat,busy,onClose,onSend}){const [input,setInput]=useState("");function submit(e){e.preventDefault();if(input.trim()){onSend(input);setInput("")}}return <div className="assistant-panel"><header><div><b>✦ Flow AI</b><small>Your virtual productivity assistant</small></div><button onClick={onClose} aria-label="Close assistant">×</button></header><div className="chat-body">{!chat.length&&<div className="assistant-welcome"><span>✦</span><b>How can I help?</b><p>Ask me to prioritize your tasks, plan your day, or think through a project.</p><div className="suggestions"><button onClick={()=>onSend("What should I work on first?")}>What should I work on first?</button><button onClick={()=>onSend("Help me plan today.")}>Help me plan today.</button></div></div>}{chat.map((message,index)=><div key={index} className={`chat-message ${message.role}`}>{message.text}</div>)}{busy&&<div className="typing"><i></i><i></i><i></i></div>}</div><form className="chat-form" onSubmit={submit}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask Flow AI anything..." /><button disabled={busy||!input.trim()} aria-label="Send message">↑</button></form></div>}
function TaskModal({onClose,onSave}){const [title,setTitle]=useState(""),[project,setProject]=useState("Website refresh"),[priority,setPriority]=useState("medium"),[due,setDue]=useState("Today");return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={e=>{e.preventDefault();if(title.trim())onSave({title:title.trim(),project,priority,due})}}><h2>Add a new task</h2><label>Task name</label><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="What needs doing?" required/><label>Project</label><select value={project} onChange={e=>setProject(e.target.value)}><option>Website refresh</option><option>Client work</option><option>Personal</option><option>Work</option></select><label>Priority</label><select value={priority} onChange={e=>setPriority(e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><label>Due</label><select value={due} onChange={e=>setDue(e.target.value)}><option>Today</option><option>Tomorrow</option><option>Fri, Sep 26</option><option>Mon, Sep 29</option></select><div className="modal-footer"><button type="button" className="cancel" onClick={onClose}>Cancel</button><button className="submit">Add task</button></div></form></div>}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
