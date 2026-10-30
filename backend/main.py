import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from workflow import app_graph
from fastapi.middleware.cors import CORSMiddleware
import json


app = FastAPI(title="Multi Agent Code Review System")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/review")
async def websockets_review(ws: WebSocket):
    await ws.accept()
    print("=== frontend connect ===")
    try:
        # Accept frontend code text
        payload = await ws.receive_json()
        code_text = payload.get("code", "")

        if not code_text:
            await ws.send_json({"type": "error", "message": "The code can't be empty"})
            return

        final_state = None

        async for event in app_graph.astream({"code": code_text}, stream_mode="updates"):
            for node_name, update in event.items():

                await ws.send_json({"type": "node_start", "node": node_name})
                await asyncio.sleep(0.3)
                await ws.send_json({"type": "node_done", "node": node_name})

                final_state = update

        report_text = final_state.get("final_report", "报告生成失败") if final_state else "无状态"

        await  ws.send_json({"type": "done", "final_report": report_text})


    except WebSocketDisconnect:
        print("=== frontend disconnected ===")

    except Exception as e:
        print(f"=== go wrong: {e} ===")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except:
            pass