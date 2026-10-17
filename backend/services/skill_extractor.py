"""
QueryMind - Intelligent Skill Extraction Service
Determines technical competencies, categories, and XP from completed tasks and deliverables.
"""

import re
from typing import List, Dict, Any, Tuple

# Domain Ontology Mapping: Pattern -> (Skill Name, Category)
SKILL_ONTOLOGY: List[Tuple[re.Pattern, str, str]] = [
    # Algorithms & Problem Solving
    (re.compile(r"two[- ]?pointer", re.I), "Two Pointers", "Algorithms & Problem Solving"),
    (re.compile(r"sliding window", re.I), "Sliding Window", "Algorithms & Problem Solving"),
    (re.compile(r"binary search", re.I), "Binary Search", "Algorithms & Problem Solving"),
    (re.compile(r"monotonic (stack|queue)", re.I), "Monotonic Structures", "Algorithms & Problem Solving"),
    (re.compile(r"dynamic programming|\b1d dp\b|\b2d dp\b|memoiz|tabulat", re.I), "Dynamic Programming", "Algorithms & Problem Solving"),
    (re.compile(r"backtrack|combinatorial search", re.I), "Backtracking", "Algorithms & Problem Solving"),
    (re.compile(r"binary tree|bst|tree traversal|lowest common ancestor", re.I), "Trees & BSTs", "Algorithms & Problem Solving"),
    (re.compile(r"trie|prefix tree", re.I), "Tries & Prefix Trees", "Algorithms & Problem Solving"),
    (re.compile(r"heap|priority queue", re.I), "Heaps & Priority Queues", "Algorithms & Problem Solving"),
    (re.compile(r"graph (traversal|topolog)|bfs|dfs|dijkstra|shortest path|cycle detection", re.I), "Graph Algorithms", "Algorithms & Problem Solving"),
    (re.compile(r"disjoint set|union[- ]find|\bdsu\b", re.I), "Disjoint Set Union (DSU)", "Algorithms & Problem Solving"),
    (re.compile(r"hash (map|table)|frequency table|anagram", re.I), "Hash Maps & Invariants", "Algorithms & Problem Solving"),
    (re.compile(r"linked list|fast[- ]slow pointer|lru cache", re.I), "Linked Lists", "Algorithms & Problem Solving"),
    (re.compile(r"bit manipulation|bitwise", re.I), "Bit Manipulation", "Algorithms & Problem Solving"),
    (re.compile(r"prefix sum|difference array", re.I), "Prefix Sums", "Algorithms & Problem Solving"),
    (re.compile(r"interval scheduling|merge intervals", re.I), "Interval Scheduling", "Algorithms & Problem Solving"),
    (re.compile(r"matrix transformation|2d grid", re.I), "Matrix Manipulation", "Algorithms & Problem Solving"),

    # Systems & Operating Systems
    (re.compile(r"operating system|cpu scheduling|process scheduling", re.I), "CPU Scheduling", "Systems & OS"),
    (re.compile(r"virtual memory|paging|page fault|segmentation", re.I), "Virtual Memory & Paging", "Systems & OS"),
    (re.compile(r"deadlock|concurrency|mutex|semaphore|thread", re.I), "Concurrency & Synchronization", "Systems & OS"),
    (re.compile(r"file system|inode|disk scheduling", re.I), "File Systems & Storage", "Systems & OS"),
    (re.compile(r"linux cli|shell script|bash", re.I), "Linux & Shell Scripting", "Systems & OS"),
    (re.compile(r"socket programming|ipc|inter[- ]process", re.I), "IPC & Sockets", "Systems & OS"),

    # Databases & Storage
    (re.compile(r"sql query|query optimiz|indexing|b[- ]?tree index", re.I), "SQL & Query Optimization", "Databases"),
    (re.compile(r"normalization|\bbcnf\b|\b3nf\b|relational schema", re.I), "Database Schema & Normalization", "Databases"),
    (re.compile(r"transaction|acid|concurrency control|isolation level", re.I), "Transactions & ACID", "Databases"),
    (re.compile(r"redis|caching|cache invalidation", re.I), "In-Memory Caching (Redis)", "Databases"),
    (re.compile(r"vector database|qdrant|embedding search|pinecone", re.I), "Vector Databases & Search", "Databases"),
    (re.compile(r"postgresql|postgres", re.I), "PostgreSQL", "Databases"),

    # Computer Networks & Security
    (re.compile(r"tcp/ip|osi model|three[- ]way handshake", re.I), "TCP/IP & OSI Architecture", "Computer Networks"),
    (re.compile(r"routing protocol|ospf|bgp|shortest path routing", re.I), "Routing & Switching", "Computer Networks"),
    (re.compile(r"subnetting|ip addressing|cidr", re.I), "IP Addressing & Subnetting", "Computer Networks"),
    (re.compile(r"wireshark|packet sniff|pcap", re.I), "Packet Analysis (Wireshark)", "Computer Networks"),
    (re.compile(r"owasp|sql injection|sqli|xss|csrf|web security", re.I), "Web Security & OWASP", "Cybersecurity"),
    (re.compile(r"nmap|port scan|reconnaissance", re.I), "Network Recon & Scanning", "Cybersecurity"),
    (re.compile(r"burp suite|proxy intercept|auth bypass", re.I), "Web Penetration Testing", "Cybersecurity"),
    (re.compile(r"metasploit|meterpreter|exploit misconfiguration|exploit|cve", re.I), "Vulnerability Exploitation & Metasploit", "Cybersecurity"),
    (re.compile(r"cyberchef|cryptograph|hashing|password crack|hashcat|john the ripper", re.I), "Applied Cryptography & Hash Analysis", "Cybersecurity"),
    (re.compile(r"privilege escalation|privesc|lateral movement", re.I), "Privilege Escalation & Post-Exploitation", "Cybersecurity"),
    (re.compile(r"siem|soc|incident response|log analysis", re.I), "Security Operations & Monitoring", "Cybersecurity"),

    # AI & Machine Learning
    (re.compile(r"numpy|vectorized|matrix computation", re.I), "Vectorized Data (NumPy)", "AI & Machine Learning"),
    (re.compile(r"pandas|data wrangling|data cleaning", re.I), "Data Wrangling (Pandas)", "AI & Machine Learning"),
    (re.compile(r"exploratory data|seaborn|matplotlib|eda", re.I), "Exploratory Data Analysis", "AI & Machine Learning"),
    (re.compile(r"scikit[- ]learn|linear regression|random forest|xgboost|classification", re.I), "Classical Machine Learning", "AI & Machine Learning"),
    (re.compile(r"cross[- ]validation|roc[- ]auc|hyperparameter", re.I), "Model Evaluation & Tuning", "AI & Machine Learning"),
    (re.compile(r"pytorch|tensor ops|autograd|backprop", re.I), "Deep Learning (PyTorch)", "AI & Machine Learning"),
    (re.compile(r"convolutional|cnn|computer vision", re.I), "Computer Vision & CNNs", "AI & Machine Learning"),
    (re.compile(r"transformer|attention mechanism|bert|gpt|llm", re.I), "Transformers & LLMs", "AI & Machine Learning"),
    (re.compile(r"rag|retrieval augmented|semantic search", re.I), "RAG Architectures", "AI & Machine Learning"),

    # Theoretical CS & Compilers
    (re.compile(r"theory of computation|automata|\bdfa\b|\bnfa\b|regular expression", re.I), "Automata & Formal Languages", "Theoretical CS"),
    (re.compile(r"turing machine|decidability|undecidable|\bp vs np\b", re.I), "Computability & Complexity", "Theoretical CS"),
    (re.compile(r"compiler|lexer|lexical analys|syntax analys|parser", re.I), "Compiler Design & Parsing", "Theoretical CS"),

    # Professional & Universal Workplace Skills
    (re.compile(r"slack|email template|feedback ticket|loom|communication|active listening|stakeholder", re.I), "Executive Communication & Team Leadership", "Professional Communication"),
    (re.compile(r"resume|interview|star format|mock interview|portfolio", re.I), "Interview & Career Strategy", "Career Strategy"),

    # Mathematics & Foundations
    (re.compile(r"propositional logic|set theory|digital logic|boolean algebra", re.I), "Mathematical Logic & Set Theory", "Mathematics & Foundations"),
    (re.compile(r"combinatorics|probability|discrete math", re.I), "Combinatorics & Applied Probability", "Mathematics & Foundations"),

    # Backend & DevOps
    (re.compile(r"fastapi|rest api|api design|pydantic", re.I), "FastAPI & REST Architecture", "Backend Engineering"),
    (re.compile(r"docker|containeriz|dockerfile", re.I), "Docker & Containerization", "DevOps & Cloud"),
    (re.compile(r"microservice|load balanc|reverse proxy", re.I), "Distributed Systems Design", "Backend Engineering"),
]


def extract_skills_from_task(
    task_title: str,
    deliverable: str = "",
    tools: List[str] = None,
    sub_goal: str = "",
    category: str = "engineering",
) -> List[Dict[str, str]]:
    """
    Extracts distinct competencies and their domain categories from task metadata.
    Returns a list of dicts: [{"skill_name": ..., "category": ...}]
    """
    tools = tools or []
    combined_text = f"{task_title} {deliverable} {sub_goal} {' '.join(tools)}"
    
    extracted: Dict[str, str] = {}

    # Match ontology rules
    for pattern, skill_name, cat in SKILL_ONTOLOGY:
        if pattern.search(combined_text):
            extracted[skill_name] = cat

    # Also detect tool-level competencies
    tool_map = {
        "python": ("Python", "Programming Languages"),
        "python3": ("Python", "Programming Languages"),
        "typescript": ("TypeScript", "Programming Languages"),
        "javascript": ("JavaScript", "Programming Languages"),
        "c++": ("C++", "Programming Languages"),
        "docker": ("Docker", "DevOps & Cloud"),
        "wireshark": ("Wireshark", "Computer Networks"),
        "nmap": ("Nmap", "Cybersecurity"),
        "burp suite": ("Burp Suite", "Cybersecurity"),
        "metasploit": ("Metasploit", "Cybersecurity"),
        "cyberchef": ("CyberChef", "Cybersecurity"),
        "portswigger": ("PortSwigger Web Security", "Cybersecurity"),
        "sqlmap": ("SQLMap", "Cybersecurity"),
        "pytorch": ("PyTorch", "AI & Machine Learning"),
        "fastapi": ("FastAPI", "Backend Engineering"),
        "leetcode": ("Problem Solving & LeetCode", "Algorithms & Problem Solving"),
    }
    for tool in tools:
        t_clean = tool.strip().lower()
        if t_clean in tool_map:
            s_name, s_cat = tool_map[t_clean]
            extracted[s_name] = s_cat

    # Fallback if no specific pattern matched: derive clean concept from task title
    if not extracted:
        # Strip common action verbs
        clean_title = re.sub(
            r"^(implement|construct|master|analyze|configure|build|execute|solve|perform|design|develop|create)\s+",
            "",
            task_title,
            flags=re.I,
        ).strip()
        # Take first 4 words as skill title
        tokens = clean_title.split()
        fallback_name = " ".join(tokens[:4]).title() if tokens else task_title.title()
        
        cat_title = category.replace("_", " ").title() if category else "Engineering"
        extracted[fallback_name] = cat_title

    # Deduplicate redundant tool sub-skills if their specialized parent skill is already extracted
    redundant_pairs = [
        ("Docker & Containerization", "Docker"),
        ("Vulnerability Exploitation & Metasploit", "Metasploit"),
        ("Packet Analysis (Wireshark)", "Wireshark"),
        ("FastAPI & REST Architecture", "FastAPI"),
        ("Deep Learning (PyTorch)", "PyTorch"),
        ("Network Recon & Scanning", "Nmap"),
        ("Web Penetration Testing", "Burp Suite"),
    ]
    for parent_skill, child_tool in redundant_pairs:
        if parent_skill in extracted and child_tool in extracted:
            del extracted[child_tool]

    return [{"skill_name": k, "category": v} for k, v in extracted.items()]
