const ALLOWED_ORIGIN = "https://projecthenry.pages.dev";
const SYSTEM = `You are Henry AI, the friendly study companion inside Project Henry for university and college students, especially in Kenya. Speak naturally, warm, direct and patient; avoid stiff AI disclaimers and generic filler. Help students understand, brainstorm, outline, write, revise, solve problems step-by-step, make notes and quiz themselves. Adapt explanations to their level and Kenyan context where relevant. For assignments, help produce useful structured work while explaining reasoning and encouraging the student's own voice. Never invent citations, sources, statistics or quotes; distinguish uncertain claims and recommend verifying sources. Answer the actual question and ask clarifying questions only when genuinely needed. Use clear formatting and concise responses unless detail is needed.`;
export default {
 async fetch(request, env) {
  const origin=request.headers.get("Origin")||"";
  const cors={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
  if(origin!==ALLOWED_ORIGIN && origin!=="https://henrymuli.pages.dev") return new Response("Forbidden",{status:403});
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors});
  if(!env.GEMINI_API_KEY) return new Response(JSON.stringify({error:"The Study Room service hasn't been configured yet."}),{status:503,headers:{...cors,"Content-Type":"application/json"}});
  try {
   const body=await request.json();
   if(!Array.isArray(body.messages)||body.messages.length===0||body.messages.length>20) return new Response(JSON.stringify({error:"Please send a valid chat."}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
   const messages=body.messages.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-16);
   if(messages.some(m=>m.content.length>12000)) return new Response(JSON.stringify({error:"A message is too long. Please shorten it."}),{status:413,headers:{...cors,"Content-Type":"application/json"}});
   const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
   const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="+encodeURIComponent(env.GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents,generationConfig:{temperature:0.75,maxOutputTokens:2048}})});
   const data=await response.json();
   if(!response.ok) {
    const upstreamMessage = data?.error?.message || "Google Gemini returned an error.";
    const safeMessage = response.status===429
      ? "Study Room has reached a temporary usage limit. Please try again later."
      : "Gemini API error ("+response.status+"): "+upstreamMessage;
    return new Response(JSON.stringify({error:safeMessage}),{status:response.status===429?429:502,headers:{...cors,"Content-Type":"application/json"}});
   }
   const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
   if(!answer) throw new Error("No response");
   return new Response(JSON.stringify({reply:answer}),{headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({error:"Something went wrong. Please try again shortly."}),{status:500,headers:{...cors,"Content-Type":"application/json"}})}
 }
}
