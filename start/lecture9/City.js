import * as THREE from 'three';

export class City {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.createCity();
    }

    createCity() {
        const cityWidth = 350;
        const numBuildings = 50; // Уменьшено количество зданий для редкости

        for (let i = 0; i < numBuildings; i++) {
            const width = (Math.random() * 0.8 + 0.4) * 50;
            const depth = (Math.random() * 0.8 + 0.3) * 50;
            const height = Math.random() * 35 + 15;

            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(0, 0, Math.random() * 0.5 + 0.2),
                roughness: 0.7 
            });

            const building = new THREE.Mesh(geometry, material);
            let x, z, y;
            let attempts = 20;
            let positionValid;

            do {
                x = (Math.random() - 0.5) * cityWidth * 2;
                z = (Math.random() - 0.5) * cityWidth * 2;
                y = height / 2;
                positionValid = true;

                for (const other of this.buildings) {
                    const dx = Math.abs(x - other.position.x);
                    const dz = Math.abs(z - other.position.z);
                    if (dx < (width + other.geometry.parameters.width) / 2 && 
                        dz < (depth + other.geometry.parameters.depth) / 2) {
                        positionValid = false;
                        break;
                    }
                }
                attempts--;
            } while (!positionValid && attempts > 0);

            // Вероятность того, что здание окажется на другом здании
            if (Math.random() > 0.7 && this.buildings.length > 0) {
                let randomBuilding;
                let stackAttempts = 10;
                let stackedCorrectly = false;

                while (stackAttempts > 0 && !stackedCorrectly) {
                    randomBuilding = this.buildings[Math.floor(Math.random() * this.buildings.length)];

                    // Проверяем, что новое здание меньше или равно по основанию, чем нижнее
                    if (width <= randomBuilding.geometry.parameters.width &&
                        depth <= randomBuilding.geometry.parameters.depth) {
                        stackAttempts--
                    }
                    stackAttempts--;
                }
            }

            building.position.set(x, y, z);
            
            this.scene.add(building);
            this.buildings.push(building);
        }
    }
}
