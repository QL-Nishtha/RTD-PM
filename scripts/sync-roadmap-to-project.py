#!/usr/bin/env python3
"""
RTD Project Roadmap Automation Script
Syncs Q2 2026 roadmap CSV to GitHub Project with dates and custom fields.

Usage:
    python3 sync-roadmap-to-project.py --token YOUR_GITHUB_TOKEN --project-number 1

Requirements:
    pip install PyGithub requests
"""

import argparse
import csv
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

try:
    from github import Github, GithubException
    import requests
except ImportError:
    print("Error: Required packages not installed. Run: pip install PyGithub requests")
    sys.exit(1)

# Configuration
REPO_OWNER = "QL-Nishtha"
REPO_NAME = "RTD-PM"

# Sprint date configuration
SPRINTS = {
    "Sprint 1 (W1–2) 4th -15th May": {
        "start_date": "2026-05-04",
        "end_date": "2026-05-15",
        "focus_area": "Foundation (Funnel + Stability)"
    },
    "Sprint 2 (W3–4) 18th - 29th may": {
        "start_date": "2026-05-18",
        "end_date": "2026-05-29",
        "focus_area": "Recovery + Insights"
    },
    "Sprint 3 (W5–6) 1st-12th June": {
        "start_date": "2026-06-01",
        "end_date": "2026-06-12",
        "focus_area": "Scale + Analytics MVP"
    },
    "Sprint 4 (W7–8) 15th-26th June": {
        "start_date": "2026-06-15",
        "end_date": "2026-06-26",
        "focus_area": "Monetization + Automation"
    }
}

class RoadmapSyncer:
    def __init__(self, token: str, project_number: int):
        """Initialize GitHub API client and project details."""
        self.g = Github(token)
        self.repo = self.g.get_repo(f"{REPO_OWNER}/{REPO_NAME}")
        self.project_number = project_number
        self.project = None
        self.graphql_token = token
        self.graphql_url = "https://api.github.com/graphql"
        self.project_id = None
        
    def get_project(self) -> Optional[Dict]:
        """Fetch project details via GraphQL (Projects v2)."""
        query = """
        query {
            repository(owner: "%s", name: "%s") {
                projectsV2(first: 10) {
                    nodes {
                        number
                        id
                        title
                        fields(first: 20) {
                            nodes {
                                name
                                id
                                ... on ProjectV2Field {
                                    dataType
                                }
                            }
                        }
                    }
                }
            }
        }
        """ % (REPO_OWNER, REPO_NAME)
        
        response = requests.post(
            self.graphql_url,
            json={"query": query},
            headers={"Authorization": f"Bearer {self.graphql_token}"}
        )
        
        if response.status_code != 200:
            print(f"Error fetching projects: {response.text}")
            return None
        
        data = response.json()
        projects = data.get("data", {}).get("repository", {}).get("projectsV2", {}).get("nodes", [])
        
        for project in projects:
            if project["number"] == self.project_number:
                self.project_id = project["id"]
                print(f"✓ Found Project: {project['title']} (ID: {self.project_id})")
                self._print_project_fields(project["fields"]["nodes"])
                return project
        
        print(f"✗ Project #{self.project_number} not found")
        return None
    
    def _print_project_fields(self, fields: List[Dict]):
        """Display available project fields."""
        print("\n  Available Fields:")
        for field in fields:
            print(f"    - {field['name']} (ID: {field['id']})")
        print()
    
    def read_roadmap_csv(self, csv_path: str = "RTD_2026_Q2_Estimates(Sprint plans).csv") -> List[Dict]:
        """Read and parse the roadmap CSV file."""
        roadmap_data = []
        
        if not os.path.exists(csv_path):
            print(f"✗ CSV file not found: {csv_path}")
            return []
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Skip empty rows
                    if not any(row.values()):
                        continue
                    roadmap_data.append(row)
            
            print(f"✓ Loaded {len(roadmap_data)} deliverables from CSV")
            return roadmap_data
        except Exception as e:
            print(f"✗ Error reading CSV: {e}")
            return []
    
    def create_or_update_issue(self, deliverable: Dict) -> Optional[int]:
        """Create GitHub issue for a deliverable."""
        title = deliverable.get("Deliverable (Scoped)", "").strip()
        if not title:
            return None
        
        sprint = deliverable.get("Sprint", "").strip()
        initiative = deliverable.get("Initiative", "").strip()
        owner = deliverable.get("Owner", "").strip()
        priority = deliverable.get("Priority", "").strip()
        dependency = deliverable.get("Dependency", "").strip()
        outcome = deliverable.get("Outcome", "").strip()
        focus_area = deliverable.get("Focus Area", "").strip()
        
        # Build issue body
        body = f"""## {title}

**Sprint:** {sprint}
**Focus Area:** {focus_area}
**Initiative:** {initiative}
**Owner:** {owner}
**Priority:** {priority}
**Dependency:** {dependency if dependency and dependency != '–' else 'None'}
**Expected Outcome:** {outcome}

---

### Status
- [ ] To Do
- [ ] In Progress
- [ ] In Review
- [ ] Done

### Notes
Add implementation details, blockers, and progress updates here.
"""
        
        try:
            # Check if issue already exists (by title search)
            existing_issues = self.repo.get_issues(state="all", labels=f"sprint:{sprint}")
            for issue in existing_issues:
                if issue.title == title:
                    print(f"  ℹ Issue already exists: #{issue.number} - {title}")
                    return issue.number
            
            # Create new issue with labels
            labels = [f"sprint:{sprint}", f"priority:{priority.lower()}", f"owner:{owner}"]
            issue = self.repo.create_issue(
                title=title,
                body=body,
                labels=labels
            )
            
            print(f"  ✓ Created Issue #{issue.number}: {title}")
            return issue.number
        
        except GithubException as e:
            print(f"  ✗ Error creating issue: {e}")
            return None
    
    def add_issue_to_project(self, issue_number: int, deliverable: Dict) -> bool:
        """Add issue to project via GraphQL with custom fields."""
        if not self.project_id:
            print(f"  ✗ Project not initialized")
            return False
        
        sprint = deliverable.get("Sprint", "").strip()
        sprint_info = SPRINTS.get(sprint, {})
        start_date = sprint_info.get("start_date")
        end_date = sprint_info.get("end_date")
        priority = deliverable.get("Priority", "").strip()
        owner = deliverable.get("Owner", "").strip()
        focus_area = deliverable.get("Focus Area", "").strip()
        
        # Get issue node ID
        issue = self.repo.get_issue(issue_number)
        issue_id = issue.node_id
        
        mutation = """
        mutation {
            addProjectV2ItemById(input: {projectId: "%s", contentId: "%s"}) {
                item {
                    id
                }
            }
        }
        """ % (self.project_id, issue_id)
        
        try:
            response = requests.post(
                self.graphql_url,
                json={"query": mutation},
                headers={"Authorization": f"Bearer {self.graphql_token}"}
            )
            
            if response.status_code == 200:
                item_data = response.json()
                if "errors" in item_data:
                    print(f"    ✗ GraphQL Error: {item_data['errors']}")
                    return False
                
                item_id = item_data["data"]["addProjectV2ItemById"]["item"]["id"]
                print(f"    ✓ Added to Project: Issue #{issue_number}")
                
                # Update project fields
                self._update_project_fields(item_id, start_date, end_date, priority, sprint)
                return True
            else:
                print(f"    ✗ Error: {response.text}")
                return False
        
        except Exception as e:
            print(f"    ✗ Exception: {e}")
            return False
    
    def _update_project_fields(self, item_id: str, start_date: str, end_date: str, priority: str, sprint: str):
        """Update project custom fields for timeline visualization."""
        # Note: Field IDs need to be retrieved from your specific project
        # This is a template; you'll need to get actual field IDs from get_project()
        
        mutations = [
            # Set Sprint field
            f"""
            mutation {{
                updateProjectV2ItemFieldValue(input: {{
                    projectId: "{self.project_id}"
                    itemId: "{item_id}"
                    fieldId: "CUSTOM_FIELD_SPRINT_ID"
                    value: {{singleSelectOptionId: "{sprint}"}}
                }}) {{
                    projectV2Item {{
                        id
                    }}
                }}
            }}
            """,
            # Set Start Date
            f"""
            mutation {{
                updateProjectV2ItemFieldValue(input: {{
                    projectId: "{self.project_id}"
                    itemId: "{item_id}"
                    fieldId: "CUSTOM_FIELD_START_DATE_ID"
                    value: {{date: "{start_date}"}}
                }}) {{
                    projectV2Item {{
                        id
                    }}
                }}
            }}
            """,
            # Set End Date / Due Date
            f"""
            mutation {{
                updateProjectV2ItemFieldValue(input: {{
                    projectId: "{self.project_id}"
                    itemId: "{item_id}"
                    fieldId: "CUSTOM_FIELD_END_DATE_ID"
                    value: {{date: "{end_date}"}}
                }}) {{
                    projectV2Item {{
                        id
                    }}
                }}
            }}
            """,
            # Set Priority
            f"""
            mutation {{
                updateProjectV2ItemFieldValue(input: {{
                    projectId: "{self.project_id}"
                    itemId: "{item_id}"
                    fieldId: "CUSTOM_FIELD_PRIORITY_ID"
                    value: {{singleSelectOptionId: "{priority}"}}
                }}) {{
                    projectV2Item {{
                        id
                    }}
                }}
            }}
            """
        ]
        
        print(f"    ℹ Note: Update project field IDs in script (see _update_project_fields)")
    
    def run(self, csv_path: str = "RTD_2026_Q2_Estimates(Sprint plans).csv"):
        """Execute the full sync workflow."""
        print("🚀 Starting RTD Roadmap Sync...\n")
        
        # Step 1: Get project
        if not self.get_project():
            print("✗ Failed to fetch project. Exiting.")
            return False
        
        # Step 2: Read CSV
        roadmap = self.read_roadmap_csv(csv_path)
        if not roadmap:
            print("✗ No roadmap data loaded. Exiting.")
            return False
        
        print()
        
        # Step 3: Create issues and add to project
        print("Creating/Updating Issues...\n")
        success_count = 0
        
        for idx, deliverable in enumerate(roadmap, 1):
            sprint = deliverable.get("Sprint", "").strip()
            title = deliverable.get("Deliverable (Scoped)", "").strip()
            
            if not title or not sprint:
                continue
            
            print(f"[{idx}/{len(roadmap)}] {sprint}")
            
            # Create or find issue
            issue_number = self.create_or_update_issue(deliverable)
            if issue_number:
                # Add to project
                if self.add_issue_to_project(issue_number, deliverable):
                    success_count += 1
        
        print(f"\n✓ Sync Complete! {success_count}/{len(roadmap)} deliverables processed.")
        return True

def main():
    parser = argparse.ArgumentParser(description="Sync RTD Roadmap to GitHub Project")
    parser.add_argument("--token", required=True, help="GitHub Personal Access Token")
    parser.add_argument("--project-number", type=int, default=1, help="GitHub Project number (default: 1)")
    parser.add_argument("--csv", default="RTD_2026_Q2_Estimates(Sprint plans).csv", help="Path to roadmap CSV")
    
    args = parser.parse_args()
    
    if not args.token:
        print("Error: --token is required. Get a token at https://github.com/settings/tokens")
        sys.exit(1)
    
    syncer = RoadmapSyncer(args.token, args.project_number)
    success = syncer.run(args.csv)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
