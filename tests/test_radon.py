#!/usr/bin/env python3
"""Test Radon-based code quality scoring"""

import sys

sys.path.insert(0, "/home/toxic/development/github-advanced-search-mcp/apps/mcp-server")

from main import _calculate_code_quality

# Test 1: High-quality Python code
good_code = '''
def calculate_sum(numbers: list) -> int:
    """Calculate the sum of a list of numbers."""
    return sum(numbers)

class DataProcessor:
    """Process data efficiently."""

    def __init__(self, data):
        self.data = data

    def process(self):
        """Process the data."""
        return [x * 2 for x in self.data]
'''

# Test 2: Complex/low-quality code
bad_code = """
def x(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z):
    if a:
        if b:
            if c:
                if d:
                    if e:
                        if f:
                            if g:
                                if h:
                                    return i+j+k+l+m+n+o+p+q+r+s+t+u+v+w+x+y+z
    return 0
"""

print("🧪 Testing Radon Integration\n")

print("📊 High-Quality Code:")
result1 = _calculate_code_quality(good_code, "test.py")
print(f"  Maintainability Index: {result1['maintainability_index']}")
print(f"  Avg Complexity: {result1['avg_complexity']}")
print(f"  Grade: {result1['quality_grade']}")

print("\n📊 Low-Quality Code:")
result2 = _calculate_code_quality(bad_code, "test.py")
print(f"  Maintainability Index: {result2['maintainability_index']}")
print(f"  Avg Complexity: {result2['avg_complexity']}")
print(f"  Grade: {result2['quality_grade']}")

print(
    "\n✅ Radon integration working!" if result1["quality_grade"] > result2["quality_grade"] else "❌ Scoring inverted!"
)
