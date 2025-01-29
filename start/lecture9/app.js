import * as THREE from 'three';
import { GLTFLoader } from '../../libs/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../../libs/three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from '../../libs/three/examples/jsm/loaders/RGBELoader.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
import { GUI } from '../../libs/three/examples/jsm/libs/lil-gui.module.min.js';

const DEFAULT_SPEED = 4;
const MAX_SPEED = 8;

export class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 500 );
        this.camera.position.set(0, 1, 5);
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xaaaaaa );
        
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.5);
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight( 0xFFFFFF, 4 );
        light.position.set(0.2, 1, 1);
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.physicallyCorrectLights = true;
        container.appendChild( this.renderer.domElement );
		this.setEnvironment();
		
        this.loadingBar = new LoadingBar();

        this.loadGLTF();

        this.bullets = [];
        this.enemies = [];
        this.lastShootTime = 0;
        this.lastEnemyIndex = 0;

		this.scene.fog = new THREE.FogExp2( 0xefd1b5, 0.005 )

		let grid = new THREE.GridHelper( 1000, 20, 0x000000, 0x0e0e0e );
		grid.position.y = -10;
		grid.material.opacity = 0.2;
		grid.material.transparent = true;
		this.scene.add( grid );
        
        window.addEventListener('resize', this.resize.bind(this) );
        window.addEventListener('beforeunload', () => this.dispose());

        this.setupKeyControls();

        this.tiltAngle = 0;

        window.test = this;
	}
    
    setEnvironment(){
        const loader = new RGBELoader();
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
         
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          this.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( `An error occurred setting the environment ${err.message}`);
        } );
    }
    
    loadGLTF() {
        const loader = new GLTFLoader();
        loader.setPath('../../assets/shahed-131_special_edition_white/');

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('../../libs/three/examples/jsm/libs/draco/');

        loader.setDRACOLoader(dracoLoader);

        loader.load(
            'scene.gltf',
            gltf => {
                this.originalGLTF = gltf; // Сохраняем оригинальную модель
                this.addPlayer(gltf);
                this.addEnemies();
            },
            xhr => {
                this.loadingBar.progress = (xhr.loaded / xhr.total);
            },
            err => {
                console.error(err);
            }
        );
    }

    addPlayer(gltf) {
        this.player = gltf.scene;
        this.player.rotation.y = Math.PI/2;
        this.player.position.y = 0;
        this.player.currentSpeed = DEFAULT_SPEED;
        // this.player.position.z = -0.85;
        this.scene.add(gltf.scene);
        this.loadingBar.visible = false;

        this.mixer = new THREE.AnimationMixer( this.player );
        this.animations = {};

        const names = [];

        gltf.animations.forEach( clip => {
            const name = clip.name.toLowerCase();
            names.push(name);
            this.animations[name] = clip;
        })

        console.log( `animations: ${names.join(',')}`);
        
        this.action = 'fuselage';

        const options = { name: 'fuselage' };

        const gui = new GUI();
        gui.add(options, 'name', names).onChange( name => { this.action = name });

        this.scene.add( gltf.scene );
        
        this.loadingBar.visible = false;
        
        this.renderer.setAnimationLoop( this.render.bind(this));
    }

    addEnemies() {
        const enemiesCount = 20;

        if (!this.originalGLTF) {
            console.error("GLTF-модель ещё не загружена!");
            return;
        }

        for (let i = 0; i < enemiesCount; i++) {
            this.addEnemy(this.originalGLTF);
        }
    }

    getRandCoordinates() {
        const array = [
            [{x:-6,y:-4},   {x:2,y:-4},  {x:-2,y:-4},  {x:6,y:-4}],
            [{x:-6,y:0},    {x:2,y:0},   {x:-2,y:0},   {x:6,y:0}],
            [{x:-6,y:4},    {x:2,y:4},   {x:-2,y:4},   {x:6,y:4}],
        ];

        const flatArray = array.flat();
        const randIndex = Math.floor(flatArray.length * Math.random());
        if (randIndex === this.lastEnemyIndex) return this.getRandCoordinates();
        this.lastEnemyIndex = randIndex;
        return flatArray[randIndex];
    }

    addEnemy(gltf) {
        const enemy = gltf.scene.clone();
        enemy.rotation.y = Math.PI * 1.5;
        
        const x = getRandomInRange(-19, 19);
        const y = getRandomInRange(-9, 9);
        const startPositionOffset = 15;
        const offsetBetweenEnemies = 10;
        const zPosition = (this.enemies.length + 1) * offsetBetweenEnemies + startPositionOffset;
        
        enemy.position.set(x, y, -zPosition);
        this.enemies.push(enemy);

        enemy.mixer = new THREE.AnimationMixer(enemy);

        const fuselageAnimation = this.animations?.['fuselage'];
        if (fuselageAnimation) {
            const action = enemy.mixer.clipAction(fuselageAnimation);
            action.play();
        }

        this.scene.add(enemy);
    }

    set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
			action.reset();
			this.actionName = name.toLowerCase();
			action.play();
            if (this.curAction) {
                this.curAction.crossFadeTo(action, 0.5);
            }
			this.curAction = action;
		}
	}

    setupKeyControls() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            shoot: false,
            acceleration: false
        };

        const keyMap = {
            ArrowUp: 'forward', KeyW: 'forward',
            ArrowDown: 'backward', KeyS: 'backward',
            ArrowLeft: 'left', KeyA: 'left',
            ArrowRight: 'right', KeyD: 'right',
            Space: 'shoot',
            ShiftLeft: 'acceleration'
        };

        const updateKey = (event, value) => {
            if (keyMap[event.code] !== undefined) {
                this.keys[keyMap[event.code]] = value;
            }
        };

        window.addEventListener('keydown', (event) => updateKey(event, true));
        window.addEventListener('keyup', (event) => updateKey(event, false));
    }

    updateCamera(deltaTime) {
        if (!this.player || !this.player.position) {
            console.error("Player или его позиция не определены!");
            return;
        }

        const offset = new THREE.Vector3(0, 2, 5); // Смещение камеры
        const elasticity = 3; // Параметр эластичности

        const targetPosition = new THREE.Vector3().copy(this.player.position).add(offset);

        this.camera.position.lerp(targetPosition, deltaTime * elasticity);

        // Камера смотрит на игрока
        this.camera.lookAt(this.player.position);
    }

    updateMovement(deltaTime) {
        const maxTilt = Math.PI / 2 * 0.65; // максимальный угол наклона (треть от 180)
        const tiltSpeed = 0.75; // скорость наклона

        // Двигаем объект в зависимости от нажатых клавиш
        if (this.keys.forward) {
            this.player.position.y += DEFAULT_SPEED * deltaTime; // Вверх
        }
        if (this.keys.backward) {
            this.player.position.y -= DEFAULT_SPEED * deltaTime; // Вниз
        }

        // Управляем наклоном
        if (this.keys.left) {
            this.turn(-1, tiltSpeed, deltaTime, maxTilt);
        }
        if (this.keys.right) {
            this.turn(1, tiltSpeed, deltaTime, maxTilt);
        }

        // Если клавиши влево/вправо не нажаты, плавно возвращаем угол к 0
        if (!this.keys.left && !this.keys.right) {
            if (this.tiltAngle > 0) {
                this.tiltAngle = Math.max(this.tiltAngle - tiltSpeed * deltaTime, 0);
            } else if (this.tiltAngle < 0) {
                this.tiltAngle = Math.min(this.tiltAngle + tiltSpeed * deltaTime, 0);
            }
        }

        if (this.keys.acceleration) {
            this.accelerate();
        }

        if (!this.keys.acceleration) {
            this.deAccelerate();
        }

        // Устанавливаем начальный поворот по оси Z (90 градусов)
        const initialRotationZ = Math.PI * 0.5; // Поворот на 90 градусов

        // Создаем вектор оси для наклона по локальной оси Y (влево-вправо)
        const tiltAxis = new THREE.Vector3(1, 0, 0); // Ось Y для наклона

        // Устанавливаем поворот объекта, комбинируя начальный поворот и наклон
        this.player.rotation.set(0, initialRotationZ, 0); // Начальный поворот по Z
        this.player.rotateOnAxis(tiltAxis, this.tiltAngle); // Наклоняем объект относительно Y
    }

    turn(direction, tiltSpeed, deltaTime, maxTilt) {
        // Если наклон не равен 0, сначала возвращаем его к 0
        if ((direction < 0 && this.tiltAngle > 0) || (direction > 0 && this.tiltAngle < 0)) {
            this.tiltAngle = THREE.MathUtils.clamp(
                this.tiltAngle - Math.sign(this.tiltAngle) * tiltSpeed * deltaTime, 
                -maxTilt, 
                maxTilt
            );
        } else {
            // Теперь наклоняем модель в нужную сторону
            this.tiltAngle = THREE.MathUtils.clamp(
                this.tiltAngle + direction * tiltSpeed * deltaTime, 
                -maxTilt, 
                maxTilt
            );

            // Двигаем объект по оси X только если угол уже вернулся к 0 или начал наклоняться в нужную сторону
            if (Math.abs(this.tiltAngle) < 0.01 || Math.sign(this.tiltAngle) === direction) {
                this.player.position.x += direction * DEFAULT_SPEED * deltaTime;
            }
        }
    }

    accelerate() {
        const increment = 0.15;
        const newSpeed = this.player.currentSpeed + increment;

        this.player.currentSpeed = Math.min(newSpeed, MAX_SPEED);
    }

    deAccelerate() {
        const decrement = 0.45;
        const newSpeed = this.player.currentSpeed - decrement;

        this.player.currentSpeed = Math.max(newSpeed, DEFAULT_SPEED);
    }

    shoot() {
        if (!this.keys.shoot) {
            return
        }

        const reloadTime = 0.4;

        if (this.clock.elapsedTime <= this.lastShootTime + reloadTime) {
            return
        }

        // Создаём пулю
        const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Позиционируем пулю перед объектом
        bullet.position.set(this.player.position.x, this.player.position.y, this.player.position.z - 0.5);
        this.scene.add(bullet);
        
        // Анимация пули - перемещение вперед
        const bulletSpeed = MAX_SPEED * 2; // Скорость полета пули
        const bulletLifetime = 3; // Время жизни пули в секундах

        const shootDirection = new THREE.Vector3(0, 0, -1); // Двигаем пулю вперед
        this.bullets.push({ mesh: bullet, direction: shootDirection, speed: bulletSpeed, lifetime: bulletLifetime });

        this.lastShootTime = this.clock.elapsedTime;
    }

    // Обновление пуль в рендере
    updateBullets(deltaTime) {
        if (!this.bullets) {
            return;
        }

        const bulletsToRemove = [];
        const enemiesToRemove = [];

        this.bullets.forEach((bullet, bulletIndex) => {
            // Обновляем позицию пули
            bullet.mesh.position.add(bullet.direction.clone().multiplyScalar(bullet.speed * deltaTime));
            bullet.lifetime -= deltaTime;

            // Обновляем матрицу и boundingBox пули
            bullet.mesh.updateMatrixWorld();
            if (!bullet.boundingBox) {
                bullet.boundingBox = new THREE.Box3().setFromObject(bullet.mesh);
            } else {
                bullet.boundingBox.copy(bullet.mesh.geometry.boundingBox).applyMatrix4(bullet.mesh.matrixWorld);
            }

            // Проверяем коллизию пули с врагами
            this.enemies.forEach((enemy, enemyIndex) => {
                // Обновляем матрицу и boundingBox врага
                enemy.updateMatrixWorld();

                enemy.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        if (!child.boundingBox) {
                            child.boundingBox = new THREE.Box3().setFromObject(child);
                        }
            
                        // Обновляем boundingBox врага
                        child.boundingBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);

                        // Проверяем пересечение boundingBox пули и врага
                        if (bullet.boundingBox.intersectsBox(child.boundingBox)) {
                            console.log(`Collision detected between bullet and enemy #${enemyIndex}!`);

                            // Записываем объекты для удаления
                            enemiesToRemove.push(enemyIndex);
                            bulletsToRemove.push(bulletIndex);
                        }
                    }
                });
            });

            // Удаляем пулю, если её время жизни истекло
            if (bullet.lifetime <= 0) {
                bulletsToRemove.push(bulletIndex);
            }
        });

        // Удаляем пули
        bulletsToRemove.forEach((bulletIndex) => {
            this.scene.remove(this.bullets[bulletIndex].mesh);
            this.bullets.splice(bulletIndex, 1);
        });

        // Удаляем врагов
        enemiesToRemove.forEach((enemyIndex) => {
            this.scene.remove(this.enemies[enemyIndex]);
            this.enemies.splice(enemyIndex, 1);
        });
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }

    dispose() {
        debugger
        // Удаляем обработчики событий
        window.removeEventListener('resize', this.resize);
        
        // Очищаем рендерер
        this.renderer.dispose();
        
        // Очищаем сцену от объектов
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object.texture) object.texture.dispose();
        });

        // Очищаем анимации
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.player);
        }

        // Очищаем массивы врагов и пуль
        this.enemies.forEach(enemy => {
            enemy.mixer.stopAllAction();
            enemy.mixer.uncacheRoot(enemy);
        });
        this.enemies = [];
        this.bullets = [];

        // Очищаем анимационный цикл
        this.renderer.setAnimationLoop(null);

        console.log("App disposed");
    }

	render() {
        const deltaTime = this.clock.getDelta();

        this.updateMovement(deltaTime);
        this.updateCamera(deltaTime);
        this.updateBullets(deltaTime); // Обновление полета пуль
    
        if (this.mixer) this.mixer.update(deltaTime);
        if (this.keys.shoot) this.shoot(); // Проверяем, нужно ли стрелять

        if (this.enemies) {
            this.enemies.forEach(enemy => {
                enemy.mixer.update(deltaTime);
            })
        }

        this.player.position.z -= this.player.currentSpeed * deltaTime;    
        this.renderer.render( this.scene, this.camera );
    }
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}
