import unittest

from hugo import build_site


class TestHugo(unittest.TestCase):
    def test_build_site(self):
        # Test case 1: Test build site with default options
        # Create mock data for the site
        site_data = {
            "title": "My Hugo Site",
            "content": "Hello, world!",
            # Add more relevant data as needed
        }
        
        # Call the build_site function with the mock data
        result = build_site(site_data)
        
        # Assert the expected output based on the man page description
        self.assertEqual(result, "Site successfully built.")
        
        # Add more test cases to cover different scenarios and options
        
        # Test case 2: Test build site with custom options
        # Create mock data with custom options
        site_data_custom = {
            "title": "My Custom Hugo Site",
            "content": "Hello, custom world!",
            # Add more relevant data as needed
        }
        
        # Call the build_site function with the custom options
        result_custom = build_site(site_data_custom)
        
        # Assert the expected output based on the man page description
        self.assertEqual(result_custom, "Custom site successfully built.")
        
        # Add more test cases to cover different scenarios and options
    
    # Add more test methods to cover other functions and scenarios
    
if __name__ == "__main__":
    unittest.main()
