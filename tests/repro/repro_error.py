import pytest
from unittest.mock import MagicMock, patch


@pytest.mark.parametrize("query", [
    "nextjs clerk organization multi-tenant dashboard",
    "shadcn dashboard clerk organization switcher",
])
def test_search_code_mocked(query):
    """Mock `github.Github.search_code` and verify that our client code handles results."""
    with patch("github.Github") as MockGithub:
        mock_instance = MagicMock()

        # Create a fake search result iterator with one fake file object
        fake_file = MagicMock()
        fake_file.path = "src/index.js"
        fake_file.repository.full_name = "owner/repo"

        class FakeIterator:
            def __iter__(self):
                yield fake_file

            @property
            def totalCount(self):
                return 1

        mock_instance.return_value.search_code.return_value = FakeIterator()

        client = MockGithub("dummy")
        results = client.search_code(query=query)

        # Validate the fake results behave as expected
        assert results.totalCount == 1
        items = list(results)
        assert items[0].path == "src/index.js"
