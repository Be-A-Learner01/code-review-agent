from typing import TypedDict, Dict
from langgraph.types import Send
import asyncio
from langgraph.graph import StateGraph, END, START
from agents import syntax_agent, security_agent, style_agent


# Define global state
class ReviewState(TypedDict):
    code: str
    syntax_result: str
    security_result: str
    style_result: str
    final_report: str



#Safety actuator
Agent_TIMEOUT = 30.0
async def safe_invoke(agent, code, name):
    try:
        # Set a 30-second timeout to prevent a certain API from blocking the entire process
        resp = await asyncio.wait_for(
            agent.ainvoke({"messages": {"role": "user", "content": code}}),
            timeout=Agent_TIMEOUT
        )
        return resp["messages"][-1].content
    except asyncio.TimeoutError:
        return f"[{name}审查超时] 超过了 {Agent_TIMEOUT} 秒限制"
    except Exception as e:
        return f"[{name}审查失败] 错误信息: {str(e)}"


# Fan-out
def dispatch_review(state: ReviewState):
    """ Entry node: Distribute the code to three parallel subtasks """
    code = state["code"]

    # Use the Send API trigger the parallel processing
    return [
        Send("run_syntax", {"code": code}),
        Send("run_security", {"code": code}),
        Send("run_style", {"code": code})
    ]


async def run_syntax(state: ReviewState) -> Dict[str, str]:
    """ Syntax review node"""
    result = safe_invoke(syntax_agent, state["code"], "Syntax")
    return {"syntax_result": result}

async def run_security(state: ReviewState) -> Dict[str, str]:
    """ Security review node"""
    result = safe_invoke(security_agent, state["code"], "Security")
    return {"security_result": result}


async def run_style(state: ReviewState) -> Dict[str, str]:
    """ Style review node"""
    result = safe_invoke(style_agent, state["code"], "Style")
    return {"style_result": result}


#Fan-in
def summarize(state: ReviewState) -> Dict[str, str]:
    """
    Aggregation Node (Fan-in): After all three branches have completed their execution, the results are combined into a Markdown report.
    """
    report = f"""# 📝 code review report

    ## 🔍 Syntax Review
    {state.get('syntax_result', 'No result')}

    ## 🔒 Security Review
    {state.get('security_result', 'No result')}

    ## 🎨 Style Review
    {state.get('style_result', 'No result')}
    """
    return {"final_report": report}

#Build workflow
workflow = StateGraph(ReviewState)


#Set node
workflow.add_node("run_syntax", run_syntax)
workflow.add_node("run_security", run_security)
workflow.add_node("run_style", run_style)
workflow.add_node("summarize", summarize)

#Set config edges
workflow.add_conditional_edges(START, dispatch_review, ["run_syntax", "run_security", "run_style"])

#Set normal edges
workflow.add_edge("run_syntax", "summarize")
workflow.add_edge("run_security", "summarize")
workflow.add_edge("run_style", "summarize")
workflow.add_edge("summarize", END)

app_graph = workflow.compile()
