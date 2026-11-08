const fs = require('fs');
const path = require('path');

function getPackageFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // Check if package.json exists
            const pkgJson = path.join(filePath, 'package.json');
            if (fs.existsSync(pkgJson)) {
                results.push(pkgJson);
            }
        }
    });
    return results;
}

async function main() {
    const packages = getPackageFiles('packages').concat(getPackageFiles('packages/@n8n'));
    // Add known others
    if (fs.existsSync('api/package.json')) packages.push('api/package.json');
    if (fs.existsSync('frontend/package.json')) packages.push('frontend/package.json');

    for (const pkgPath of packages) {
        console.log(`Processing ${pkgPath}...`);
        try {
            const content = fs.readFileSync(pkgPath, 'utf8');
            const pkg = JSON.parse(content);
            let updated = false;

            const fixDeps = (deps) => {
                if (!deps) return;
                for (const key in deps) {
                    if (deps[key] && deps[key].startsWith('catalog:')) {
                        console.log(`  Replacing ${key} (${deps[key]}) -> *`);
                        deps[key] = '*';
                        updated = true;
                    }
                }
            };

            fixDeps(pkg.dependencies);
            fixDeps(pkg.devDependencies);
            fixDeps(pkg.peerDependencies);

            if (updated) {
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
                console.log(`  ✅ Updated ${pkgPath}`);
            }
        } catch (e) {
            console.error(`Error processing ${pkgPath}:`, e.message);
        }
    }
}

main();
