import httpx
import json
import sys

def test_chat():
    with httpx.Client(timeout=60.0) as client:
        res = client.get('http://127.0.0.1:8000/api/v1/spaces')
        spaces = res.json()
        space_id = spaces[0]['id']
        print(f"Using space: {space_id}")
        
        conv_res = client.post('http://127.0.0.1:8000/api/v1/conversations', json={'space_id': space_id, 'title': 'Test Stream Flow'})
        conv = conv_res.json()
        conv_id = conv['id']
        print(f"Created conv: {conv_id}")
        
        with client.stream('POST', f'http://127.0.0.1:8000/api/v1/conversations/{conv_id}/messages', json={'role': 'user', 'content': 'Hello QueryMind! Briefly introduce yourself and what you do.'}) as stream:
            print(f"SSE Status: {stream.status_code}")
            tokens = []
            for line in stream.iter_lines():
                if line.startswith('data: '):
                    payload = json.loads(line[6:])
                    ev = payload.get('event')
                    if ev == 'token':
                        tok = payload['data']['text']
                        tokens.append(tok)
                        sys.stdout.write(tok)
                        sys.stdout.flush()
                    elif ev == 'agent.status':
                        print(f"\n[Status: {payload['data'].get('agent')} - {payload['data'].get('status')}]")
                    elif ev == 'workflow.step.completed':
                        print(f"\n[Step done: {payload['data'].get('step')}]")
                    elif ev in ('message.completed', 'error'):
                        print(f"\n[Finished: {ev}] {payload}")

if __name__ == '__main__':
    test_chat()
