import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    results = {}
    with httpx.Client(timeout=10.0) as client:
        # Get space
        s_resp = client.get(f"{BASE_URL}/spaces")
        spaces = s_resp.json()
        space_id = spaces[0]["id"]
        results["/spaces"] = {"status": s_resp.status_code, "data_count": len(spaces)}

        # Health
        h_resp = client.get(f"{BASE_URL}/health")
        results["/health"] = {"status": h_resp.status_code, "data": h_resp.json()}

        # Documents
        doc_resp = client.get(f"{BASE_URL}/documents?space_id={space_id}")
        results["/documents"] = {"status": doc_resp.status_code, "data_count": len(doc_resp.json())}

        # Knowledge
        kn_resp = client.get(f"{BASE_URL}/knowledge?space_id={space_id}")
        results["/knowledge"] = {"status": kn_resp.status_code, "data_count": len(kn_resp.json())}

        # Projects
        pr_resp = client.get(f"{BASE_URL}/projects")
        results["/projects"] = {"status": pr_resp.status_code, "data_count": len(pr_resp.json())}

        # Goals
        g_resp = client.get(f"{BASE_URL}/goals")
        results["/goals"] = {"status": g_resp.status_code, "data_count": len(g_resp.json())}

        # Memories
        m_resp = client.get(f"{BASE_URL}/memories")
        results["/memories"] = {"status": m_resp.status_code, "data_count": len(m_resp.json())}

        # Conversations
        c_resp = client.get(f"{BASE_URL}/conversations")
        convs = c_resp.json()
        results["/conversations"] = {"status": c_resp.status_code, "data_count": len(convs)}

        # Actions (list proposals)
        a_resp = client.get(f"{BASE_URL}/actions?space_id={space_id}")
        results["/actions"] = {"status": a_resp.status_code, "data": a_resp.json()}

        # Search
        sr_resp = client.get(f"{BASE_URL}/search?query=architecture&space_id={space_id}")
        results["/search"] = {"status": sr_resp.status_code, "results_count": len(sr_resp.json().get("results", []))}

        # Workflows
        wf_resp = client.get(f"{BASE_URL}/workflows?space_id={space_id}")
        results["/workflows"] = {"status": wf_resp.status_code, "data_count": len(wf_resp.json())}

        # Conversation Messages
        if convs:
            last_conv_id = convs[0]["id"]
            msg_resp = client.get(f"{BASE_URL}/conversations/{last_conv_id}/messages")
            results[f"/conversations/{last_conv_id}/messages"] = {"status": msg_resp.status_code, "data_count": len(msg_resp.json())}

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    run_tests()
