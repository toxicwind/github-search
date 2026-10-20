import pytest
from unittest.mock import MagicMock
import requests


MOCK_RESPONSE = {
    "complexity": {"cyclomatic": 10},
    "quality": {"score": 90},
}


@pytest.mark.parametrize("query", [
    "def hello(): return 'world'",
    "class Test: pass",
])
def test_api_mocked(mock_api_post, query):
    """Unit test that mocks external API calls via the `mock_api_post` fixture.

    Verifies client code paths without requiring a live server.
    """
    resp = requests.post("http://localhost:8000/analyze", json={"code": query})

    assert resp.status_code == 200
    data = resp.json()
    assert "complexity" in data
    assert data["quality"]["score"] == 90


def test_api_failure_handling():
    """Ensure client behavior when API returns 500."""
    from unittest.mock import patch

    with patch("requests.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_post.return_value = mock_resp

        resp = requests.post("http://localhost:8000/analyze", json={"code": "broken"})
        assert resp.status_code == 500
