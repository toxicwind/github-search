from unittest.mock import patch, MagicMock
import pytest


@pytest.fixture
def mock_api_post():
    """Provide a mocked requests.post that returns a successful JSON payload.

    Yields the mock so tests can assert call args if desired.
    """
    with patch("requests.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "complexity": {"cyclomatic": 10},
            "quality": {"score": 90},
        }
        mock_post.return_value = mock_resp
        yield mock_post
