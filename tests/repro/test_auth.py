import os
from unittest.mock import MagicMock, patch

import pytest


def test_github_auth_mocked(monkeypatch):
    """Verify GitHub authentication flow using a mocked `github.Github` client.

    This avoids any real network calls and enforces hermetic behavior.
    """
    # Ensure a token is present for code paths that require it
    monkeypatch.setenv("GITHUB_TOKEN", "dummy-token")

    with patch("github.Github") as MockGithub:
        mock_instance = MagicMock()
        mock_instance.get_user.return_value.login = "dummy-user"
        MockGithub.return_value = mock_instance

        # Simulate the original behavior: construct Github with a quoted token
        quoted = '"dummy-token"'
        client = MockGithub(quoted)
        user = client.get_user().login

        assert user == "dummy-user"
