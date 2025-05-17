# Cloudflare Dynamic DNS Updater

A TypeScript application that automatically updates Cloudflare DNS records with
your current public IP address. This is particularly useful for servers or
devices with dynamic IP addresses that need to maintain a consistent DNS record.

## Features

- Automatically detects your public IP address
- Updates Cloudflare DNS records when your IP changes
- Supports both name-based and ID-based configuration
- Configurable polling interval
- Docker support
- Caches zone and record IDs for better performance

## Environment Variables

### Required Variables

- `CF_API_TOKEN`: Your Cloudflare API token with DNS edit permissions
- Either `CF_ZONE_NAME` or `CF_ZONE_ID`: Your Cloudflare zone (domain)
- Either `CF_RECORD_NAME` or `CF_RECORD_ID`: The DNS record to update

### Optional Variables

- `POLL_TIME_IN_MS`: Time between IP checks in milliseconds (default: 5 minutes)

## Configuration Examples

### Using Names (Simpler but Slower)

```bash
CF_API_TOKEN=your_api_token
CF_ZONE_NAME=example.com
CF_RECORD_NAME=www
```

### Using IDs (Faster, Recommended)

```bash
CF_API_TOKEN=your_api_token
CF_ZONE_ID=abc123def456
CF_RECORD_ID=xyz789uvw012
```

The application will show you the IDs to use in the warnings when you first run
it with names.

## Running Locally

1. Install dependencies:

```bash
yarn install
```

2. Build the application:

```bash
yarn build
```

3. Run the application:

```bash
yarn start
```

For development with automatic reloading:

```bash
yarn dev
```

## Docker Usage

### Building the Image

```bash
docker build -t ddns-updater .
```

### Running the Container

#### Using Names:

```bash
docker run -d \
  --name ddns-updater \
  -e CF_API_TOKEN=your_api_token \
  -e CF_ZONE_NAME=example.com \
  -e CF_RECORD_NAME=www \
  -e POLL_TIME_IN_MS=300000 \
  ddns-updater
```

#### Using IDs (Recommended):

```bash
docker run -d \
  --name ddns-updater \
  -e CF_API_TOKEN=your_api_token \
  -e CF_ZONE_ID=abc123def456 \
  -e CF_RECORD_ID=xyz789uvw012 \
  -e POLL_TIME_IN_MS=300000 \
  ddns-updater
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: "3"
services:
    ddns-updater:
        build: .
        environment:
            - CF_API_TOKEN=your_api_token
            - CF_ZONE_NAME=example.com
            - CF_RECORD_NAME=www
            - POLL_TIME_IN_MS=300000
        restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## Performance Tips

1. Use `CF_ZONE_ID` and `CF_RECORD_ID` instead of names for better performance
2. The application will show you the IDs to use in the warnings when you first
   run it
3. Adjust `POLL_TIME_IN_MS` based on how frequently your IP changes
   - Default is 5 minutes (300000 ms)
   - Minimum recommended is 1 minute (60000 ms)
   - Maximum recommended is 15 minutes (900000 ms)

## Error Handling

The application includes comprehensive error handling:

- Validates DNS record names against zone names
- Automatically fixes unqualified record names
- Provides clear error messages for configuration issues
- Continues running even if temporary errors occur

## License

This project is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

The AGPL-3.0 license allows you to:

- Use the software for any purpose
- Change the software to suit your needs
- Share the software with others
- Share the changes you make

However, it requires that:

- You include the original copyright notice
- You state significant changes made to the software
- You disclose the source code of your modifications
- You license your modifications under the same AGPL-3.0 license

This license is particularly suitable for network/cloud services as it ensures
that any modifications made to the software, even when run as a service, must be
shared with the community.

## Author

Good Samaritan Software, LLC
