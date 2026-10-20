import os
import sys

from dotenv import load_dotenv
from github import Auth, Github

load_dotenv()

token = os.getenv("GITHUB_TOKEN")
if not token:
    print("Error: GITHUB_TOKEN not found")
    sys.exit(1)

auth = Auth.Token(token)
g = Github(auth=auth)
query = "DayZ killfeed real-time"

print(f"Testing Query: '{query}'")

print("\n--- Repository Search ---")
try:
    repos_iter = g.search_repositories(query)
    # Safe iteration
    repos = []
    for i, repo in enumerate(repos_iter):
        if i >= 10:
            break
        repos.append(repo)

    print(f"Count: {repos_iter.totalCount}")
    for r in repos:
        print(f"- {r.full_name}")

    print("\n--- Code Search ---")
    code_matches_iter = g.search_code(query)
    code_matches = []
    for i, match in enumerate(code_matches_iter):
        if i >= 10:
            break
        code_matches.append(match)

    print(f"Count: {code_matches_iter.totalCount}")
    unique_repos = set()
    for c in code_matches:
        unique_repos.add(c.repository.full_name)
        print(f"- {c.path} in {c.repository.full_name}")

    print(f"\nUnique Repos from Code: {len(unique_repos)}")
    for r in unique_repos:
        print(f"  * {r}")

except Exception as e:
    print(f"Error during search: {e}")
