-- Create testing database
CREATE DATABASE IF NOT EXISTS `omnify_testing`;

-- Grant permissions to omnify user
GRANT ALL PRIVILEGES ON `omnify_testing`.* TO 'omnify'@'%';
FLUSH PRIVILEGES;
